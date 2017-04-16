import {expect} from 'chai';
import * as fetch from 'isomorphic-fetch';

// tslint:disable:no-string-literal

import {config, Record, Store} from '../src';

import mockApi from './api';
import {Event, Image, Organiser, Photo, TestStore, User} from './setup';

describe('Networking', () => {
  beforeEach(() => {
    config.fetchReference = fetch;
    config.baseUrl = 'http://example.com/';
  });

  describe('basics', () => {
    it('should fetch the basic data', async () => {
      mockApi({
        name: 'events-1',
        url: 'event',
      });

      const store = new Store();
      const events = await store.fetchAll('event');

      expect(events.data).to.be.an('array');
      expect(events.data['length']).to.equal(4);
      expect(events.data instanceof Array && events.data[0]['title']).to.equal('Test 1');
      expect(events.data[0].getMeta().createdAt).to.equal('2017-03-19T16:00:00.000Z');
      expect(events.data[0]['imageId']).to.equal('1');
      expect(events.data[0]['imageMeta']['foo']).to.equal('bar');

      const data = events.data[0].toJsonApi();
      expect(data.id).to.equal(1);
      expect(data.type).to.equal('event');
      expect(data.attributes.title).to.equal('Test 1');
      expect(data.relationships.image.data).to.eql({type: 'image', id: '1'});
    });

    it('should save the jsonapi data', async () => {
      mockApi({
        name: 'jsonapi-object',
        url: 'event',
      });

      const store = new Store();
      const events = await store.fetchAll('event');

      expect(events.data).to.be.an('array');
      expect(events.data['length']).to.equal(4);
      expect(events.jsonapi).to.be.an('object');
      expect(events.jsonapi.version).to.equal('1.0');
      expect(events.jsonapi.meta.foo).to.equal('bar');
    });

    it('should fetch one item', async () => {
      mockApi({
        name: 'event-1b',
        url: 'event/1',
      });

      const store = new Store();
      const events = await store.fetch('event', 1);

      const record = events.data as Record;

      expect(record).to.be.an('object');
      expect(record['title']).to.equal('Test 1');
      expect(record.getLinks()).to.be.an('object');
      expect(record.getLinks().self).to.equal('http://example.com/event/1234');
    });

    it('should support pagination', async () => {
      mockApi({
        name: 'events-1',
        url: 'event',
      });

      const store = new Store();
      const events = await store.fetchAll('event');

      expect(events.data).to.be.an('array');
      expect(events.data['length']).to.equal(4);
      expect(events.data instanceof Array && events.data[0]['title']).to.equal('Test 1');
      expect(events.links).to.be.an('object');
      expect(events.links['next']['href']).to.equal('http://example.com/event?page=2');
      expect(events.links['next']['meta'].foo).to.equal('bar');

      mockApi({
        name: 'events-2',
        query: {
          page: 2,
        },
        url: 'event',
      });

      const events2 = await events.next;

      expect(events2.data).to.be.an('array');
      expect(events2.data['length']).to.equal(2);
      expect(events2.data instanceof Array && events2.data[0]['title']).to.equal('Test 5');

      mockApi({
        name: 'events-1',
        url: 'event',
      });

      const events1 = await events2.prev;

      expect(events1.data).to.be.an('array');
      expect(events1.data['length']).to.equal(4);
      expect(events1.data instanceof Array && events1.data[0]['title']).to.equal('Test 1');

      const events1b = await events2.prev;
      expect(events1).to.not.equal(events);
      expect(events1).to.equal(events1b);
    });

    it('should support record links', async () => {
      mockApi({
        name: 'event-1',
        url: 'event',
      });

      const store = new Store();
      const events = await store.fetchAll('event');
      const event = events.data as Record;

      mockApi({
        name: 'image-1',
        url: 'images/1',
      });

      const image = await event.fetchLink('image');
      expect(image.data['id']).to.equal(1);
      expect(image.data['type']).to.equal('image');
      expect(image.data['url']).to.equal('http://example.com/1.jpg');
    });

    it('should support relationship link fetch', async () => {
      mockApi({
        name: 'events-1',
        url: 'event',
      });

      const store = new Store();
      const events = await store.fetchAll('event');
      const event = events.data[0] as Record;

      mockApi({
        name: 'image-1',
        url: 'images/1',
      });

      const image = await event.fetchRelationshipLink('image', 'self');
      expect(image.data['id']).to.equal(1);
      expect(image.data['type']).to.equal('image');
      expect(image.data['url']).to.equal('http://example.com/1.jpg');

    });

    it('should support baseUrl', async () => {
      class Event extends Record {
        public static type = 'event';
        public static baseUrl = 'foo/event';
      }

      // tslint:disable-next-line:max-classes-per-file
      class Collection extends Store {
        public static types = [Event];
      }

      const store = new Collection();

      mockApi({
        name: 'event-1',
        url: 'foo/event',
      });

      const response = await store.fetchAll('event');
      const event = response.data as Event;
      expect(event.type).to.equal('event');
    });

    it('should prepend config.baseUrl to the request url', async () => {
      mockApi({
        name: 'event-1b',
        url: 'event/1',
      });

      const store = new Store();
      const events = await store.request('event/1');

      const record = events.data as Record;

      expect(record['title']).to.equal('Test 1');
    });
  });

  describe('updates', () => {
    it('should update a record', async () => {
      mockApi({
        name: 'event-1',
        url: 'event/12345',
      });

      const store = new Store();
      const events = await store.fetch('event', 12345);

      const record = events.data as Record;

      mockApi({
        data: JSON.stringify({
          data: record.toJsonApi(),
        }),
        method: 'PATCH',
        name: 'event-1',
        url: 'event/12345',
      });

      const updated = await record.save();
      expect(updated['title']).to.equal('Test 1');
      expect(updated).to.equal(record);
    });

    it('should update a record with self link', async () => {
      mockApi({
        name: 'event-1b',
        url: 'event/12345',
      });

      const store = new Store();
      const events = await store.fetch('event', 12345);

      const record = events.data as Record;

      mockApi({
        data: JSON.stringify({
          data: record.toJsonApi(),
        }),
        method: 'PATCH',
        name: 'event-1b',
        url: 'event/1234',
      });

      const updated = await record.save();
      expect(updated['title']).to.equal('Test 1');
      expect(updated).to.equal(record);
    });

    it('should add a record', async () => {
      const store = new Store();
      const record = new Record({
        title: 'Example title',
        type: 'event',
      });
      store.add(record);

      mockApi({
        data: JSON.stringify({
          data: record.toJsonApi(),
        }),
        method: 'POST',
        name: 'event-1',
        url: 'event',
      });

      const data = record.toJsonApi();
      expect(record['title']).to.equal('Example title');
      expect(data.id).to.be.an('undefined');
      expect(data.type).to.equal('event');
      expect(data.attributes.id).to.be.an('undefined');
      expect(data.attributes.type).to.be.an('undefined');

      const updated = await record.save();
      expect(updated['title']).to.equal('Test 1');
      expect(updated).to.equal(record);
    });

    it('should add a record with queue (201)', async () => {
      const store = new Store();
      const record = new Record({
        title: 'Example title',
        type: 'event',
      });
      store.add(record);

      mockApi({
        data: JSON.stringify({
          data: record.toJsonApi(),
        }),
        method: 'POST',
        name: 'queue-1',
        status: 201,
        url: 'event',
      });

      const data = record.toJsonApi();
      expect(record['title']).to.equal('Example title');
      expect(data.id).to.be.an('undefined');
      expect(data.type).to.equal('event');
      expect(data.attributes.id).to.be.an('undefined');
      expect(data.attributes.type).to.be.an('undefined');

      const queue = await record.save();
      expect(queue.type).to.equal('queue');

      mockApi({
        name: 'queue-1',
        url: 'events/queue-jobs/123',
      });

      const queue2 = await queue.fetchLink('self', null, true);
      expect(queue2.data['type']).to.equal('queue');

      mockApi({
        name: 'event-1',
        url: 'events/queue-jobs/123',
      });

      const updatedRes = await queue.fetchLink('self', null, true);
      const updated = updatedRes.data as Record;
      expect(updated.type).to.equal('event');

      expect(updated['title']).to.equal('Test 1');
      expect(updated.id).to.equal(12345);
      expect(updated).to.equal(record);
    });

    it('should add a record with response 204', async () => {
      const store = new Store();
      const record = new Record({
        id: 123,
        title: 'Example title',
        type: 'event',
      });
      store.add(record);

      mockApi({
        data: JSON.stringify({
          data: record.toJsonApi(),
        }),
        method: 'POST',
        responseFn: () => null,
        status: 204,
        url: 'event',
      });

      const data = record.toJsonApi();
      expect(record['title']).to.equal('Example title');
      expect(data.type).to.equal('event');
      expect(data.attributes.id).to.be.an('undefined');
      expect(data.attributes.type).to.be.an('undefined');

      const updated = await record.save();
      expect(updated['title']).to.equal('Example title');
      expect(updated).to.equal(record);
    });

    it('should add a record with client-generated id', async () => {
      const store = new Store();

      class GenRecord extends Record {
        public static useAutogeneratedIds = true;
        public static autoIdFunction = () => '110ec58a-a0f2-4ac4-8393-c866d813b8d1';
      }

      const record = new GenRecord({
        title: 'Example title',
        type: 'event',
      });
      store.add(record);

      mockApi({
        data: JSON.stringify({
          data: record.toJsonApi(),
        }),
        method: 'POST',
        name: 'event-1c',
        url: 'event',
      });

      const data = record.toJsonApi();
      expect(record['title']).to.equal('Example title');
      expect(data.id).to.be.an('string');
      expect(data.id).to.have.length(36);
      expect(data.type).to.equal('event');
      expect(data.attributes.id).to.be.an('undefined');
      expect(data.attributes.type).to.be.an('undefined');

      const updated = await record.save();
      expect(updated['title']).to.equal('Test 1');
      expect(updated).to.equal(record);
    });

    it('should remove a record', async () => {
      mockApi({
        name: 'event-1',
        url: 'event/12345',
      });

      const store = new Store();
      const events = await store.fetch('event', 12345);

      const record = events.data as Record;

      mockApi({
        method: 'DELETE',
        name: 'event-1',
        url: 'event/12345',
      });

      expect(store.findAll('event').length).to.equal(1);
      const updated = await record.remove();
      expect(updated).to.equal(true);
      expect(store.findAll('event').length).to.equal(0);
    });

    it('should remove a local record without api calls', async () => {
      const store = new Store();
      const record = new Record({
        title: 'Example title',
        type: 'event',
      });
      store.add(record);

      expect(record['title']).to.equal('Example title');

      expect(store.findAll('event').length).to.equal(1);
      const updated = await record.remove();
      expect(updated).to.equal(true);
      expect(store.findAll('event').length).to.equal(0);
    });

    it('should remove a record from the store', async () => {
      mockApi({
        name: 'event-1',
        url: 'event/12345',
      });

      const store = new Store();
      const events = await store.fetch('event', 12345);

      const record = events.data as Record;

      mockApi({
        method: 'DELETE',
        name: 'event-1',
        url: 'event/12345',
      });

      expect(store.findAll('event').length).to.equal(1);
      const updated = await store.destroy(record.type, record.id);
      expect(updated).to.equal(true);
      expect(store.findAll('event').length).to.equal(0);
    });

    it('should remove a local record from store without api calls', async () => {
      const store = new Store();
      const record = new Record({
        title: 'Example title',
        type: 'event',
      });
      store.add(record);

      expect(record['title']).to.equal('Example title');

      expect(store.findAll('event').length).to.equal(1);
      const updated = await store.destroy(record.type, record.id);
      expect(updated).to.equal(true);
      expect(store.findAll('event').length).to.equal(0);
    });

    it('should silently remove an unexisting record', async () => {
      const store = new Store();

      expect(store.findAll('event').length).to.equal(0);
      const updated = await store.destroy('event', 1);
      expect(updated).to.equal(true);
      expect(store.findAll('event').length).to.equal(0);
    });

    it('should support updating relationships', async () => {
      mockApi({
        name: 'events-1',
        url: 'event',
      });

      const store = new Store();
      const events = await store.fetchAll('event');
      const event = events.data[0] as Record;

      event['imageId'] = [event['imageId'], '2'];

      mockApi({
        data:  {
          data: [{
            id: '1',
            type: 'image',
          }, {
            id: '2',
            type: 'image',
          }],
        },
        method: 'PATCH',
        name: 'event-1d',
        url: 'images/1',
      });

      const event2 = await event.saveRelationship('image') as Record;
      expect(event2.id).to.equal(12345);
      expect(event2.type).to.equal('event');
      expect(event2['imageId'][0]).to.equal('1');
      expect(event['imageId'][0]).to.equal('1');
      expect(event).to.equal(event2);

    });
  });

  describe('error handling', () => {
    it('should handle network failure', async () => {
      const store = new Store();

      mockApi({
        name: 'events-1',
        status: 404,
        url: 'event',
      });

      const fetch = store.fetchAll('event');

      return fetch.then(
        () => expect(true).to.equal(false),
        (err) => {
          expect(err).to.be.an('object');
          expect(err.status).to.equal(404);
          expect(err.message).to.equal('Invalid HTTP status: 404');
        },
      );
    });

    it('should handle invalid responses', async () => {
      const store = new Store();

      mockApi({
        name: 'invalid',
        url: 'event',
      });

      const fetch = store.fetchAll('event');

      return fetch.then(
        () => expect(true).to.equal(false),
        (err) => expect(err).to.be.an('error'),
      );
    });

    it('should handle api error', async () => {
      const store = new Store();

      mockApi({
        name: 'error',
        url: 'event',
      });

      const fetch = store.fetchAll('event');

      return fetch.then(
        () => expect(true).to.equal(false),
        (err) => expect(err[0]).to.be.an('object'),
      );
    });

    it('should handle api error on save', async () => {
      const store = new Store();

      const record = new Record({
        title: 'Test',
        type: 'event',
      });
      store.add(record);

      mockApi({
        method: 'POST',
        name: 'error',
        url: 'event',
      });

      const fetch = record.save();

      return fetch.then(
        () => expect(true).to.equal(false),
        (err) => expect(err[0]).to.be.an('object'),
      );
    });

    it('should handle api error on remove', async () => {
      const store = new Store();

      mockApi({
        name: 'events-1',
        url: 'event',
      });

      const response = await store.fetchAll('event');

      mockApi({
        method: 'DELETE',
        name: 'error',
        url: 'event/1',
      });

      const fetch = response.data[0].remove();

      return fetch.then(
        () => expect(true).to.equal(false),
        (err) => expect(err[0]).to.be.an('object'),
      );
    });
  });

  describe('headers', () => {
    beforeEach(() => {
      config.defaultHeaders = {
        'X-Auth': '12345',
        'content-type': 'application/vnd.api+json',
      };
    });

    it ('should send the default headers', async () => {
      mockApi({
        name: 'events-1',
        reqheaders: {
          'X-Auth': '12345',
        },
        url: 'event',
      });

      const store = new Store();
      const events = await store.fetchAll('event');

      expect(events.data).to.be.an('array');
    });

    it ('should send custom headers', async () => {
      mockApi({
        name: 'events-1',
        reqheaders: {
          'X-Auth': '54321',
        },
        url: 'event',
      });

      const store = new Store();
      const events = await store.fetchAll('event', false, {
        headers: {
          'X-Auth': '54321',
        },
      });

      expect(events.data).to.be.an('array');
    });

    it ('should receive headers', async () => {
      mockApi({
        headers: {
          'X-Auth': '98765',
        },
        name: 'events-1',
        url: 'event',
      });

      const store = new Store();
      const events = await store.fetchAll('event');

      expect(events.data).to.be.an('array');
      expect(events.headers.get('X-Auth')).to.equal('98765');
    });
  });
});

// TODO
// filter, sort, includes
