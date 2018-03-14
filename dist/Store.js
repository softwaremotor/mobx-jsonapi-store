"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var mobx_1 = require("mobx");
var NetworkStore_1 = require("./NetworkStore");
var NetworkUtils_1 = require("./NetworkUtils");
var Record_1 = require("./Record");
var utils_1 = require("./utils");
var Store = /** @class */ (function (_super) {
    __extends(Store, _super);
    function Store() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        /**
         * Cache async actions (can be overriden with force=true)
         *
         * @private
         *
         * @memberOf Store
         */
        _this.__cache = {
            fetch: {},
            fetchAll: {},
        };
        return _this;
    }
    /**
     * Import the JSON API data into the store
     *
     * @param {IJsonApiResponse} body - JSON API response
     * @returns {(IModel|Array<IModel>)} - Models parsed from body.data
     *
     * @memberOf Store
     */
    Store.prototype.sync = function (body) {
        var data = this.__iterateEntries(body, this.__addRecord.bind(this));
        this.__iterateEntries(body, this.__updateRelationships.bind(this));
        return data;
    };
    /**
     * Fetch the records with the given type and id
     *
     * @param {string} type Record type
     * @param {number|string} type Record id
     * @param {boolean} [force] Force fetch (currently not used)
     * @param {IRequestOptions} [options] Server options
     * @returns {Promise<Response>} Resolves with the Response object or rejects with an error
     *
     * @memberOf Store
     */
    Store.prototype.fetch = function (type, id, force, options) {
        var _this = this;
        var query = this.__prepareQuery(type, id, null, options);
        if (!this.static.cache) {
            return this.__doFetch(query, options);
        }
        this.__cache.fetch[type] = this.__cache.fetch[type] || {};
        // TODO: Should we fake the cache if the record already exists?
        if (force || !(query.url in this.__cache.fetch[type])) {
            this.__cache.fetch[type][query.url] = this.__doFetch(query, options)
                .catch(function (e) {
                // Don't cache if there was an error
                delete _this.__cache.fetch[type][query.url];
                throw e;
            });
        }
        return this.__cache.fetch[type][query.url];
    };
    /**
     * Fetch the first page of records of the given type
     *
     * @param {string} type Record type
     * @param {boolean} [force] Force fetch (currently not used)
     * @param {IRequestOptions} [options] Server options
     * @returns {Promise<Response>} Resolves with the Response object or rejects with an error
     *
     * @memberOf Store
     */
    Store.prototype.fetchAll = function (type, force, options) {
        var _this = this;
        var query = this.__prepareQuery(type, null, null, options);
        if (!this.static.cache) {
            return this.__doFetch(query, options);
        }
        this.__cache.fetchAll[type] = this.__cache.fetchAll[type] || {};
        if (force || !(query.url in this.__cache.fetchAll[type])) {
            this.__cache.fetchAll[type][query.url] = this.__doFetch(query, options)
                .catch(function (e) {
                // Don't cache if there was an error
                delete _this.__cache.fetchAll[type][query.url];
                throw e;
            });
        }
        return this.__cache.fetchAll[type][query.url];
    };
    /**
     * Destroy a record (API & store)
     *
     * @param {string} type Record type
     * @param {(number|string)} id Record id
     * @param {IRequestOptions} [options] Server options
     * @returns {Promise<boolean>} Resolves true or rejects with an error
     *
     * @memberOf Store
     */
    Store.prototype.destroy = function (type, id, options) {
        var model = this.find(type, id);
        if (model) {
            return model.remove(options);
        }
        return Promise.resolve(true);
    };
    Store.prototype.reset = function () {
        _super.prototype.reset.call(this);
        this.__cache.fetch = {};
        this.__cache.fetchAll = {};
    };
    Store.prototype.request = function (url, method, data, options) {
        if (method === void 0) { method = 'GET'; }
        return NetworkUtils_1.fetch({ url: this.__prefixUrl(url), options: options, data: data, method: method, store: this });
    };
    Store.prototype.removeAll = function (type) {
        var models = _super.prototype.removeAll.call(this, type);
        this.__cache.fetch[type] = {};
        this.__cache.fetchAll[type] = {};
        return models;
    };
    /**
     * Make the request and handle the errors
     *
     * @param {IQueryParams} query Request query info
     * @param {IRequestOptions} [options] Server options
     * @returns {Promise<Response>} Resolves with the Response object or rejects with an error
     *
     * @memberof Store
     */
    Store.prototype.__doFetch = function (query, options) {
        return NetworkUtils_1.read(this, query.url, query.headers, options).then(this.__handleErrors);
    };
    /**
     * Function used to handle response errors
     *
     * @private
     * @param {Response} response API response
     * @returns API response
     *
     * @memberOf Store
     */
    Store.prototype.__handleErrors = function (response) {
        /* istanbul ignore if */
        if (response.error) {
            throw response.error;
        }
        return response;
    };
    /**
     * Add a new JSON API record to the store
     *
     * @private
     * @param {IJsonApiRecord} obj - Object to be added
     * @returns {IModel}
     *
     * @memberOf Store
     */
    Store.prototype.__addRecord = function (obj) {
        var type = obj.type, id = obj.id;
        var record = this.find(type, id);
        var flattened = utils_1.flattenRecord(obj);
        if (record) {
            var data = record.static.preprocess(flattened);
            record.update(data);
        }
        else if (this.static.types.filter(function (item) { return item.type === obj.type; }).length) {
            record = this.add(flattened, obj.type);
        }
        else {
            record = new Record_1.Record(flattened);
            this.add(record);
        }
        // In case a record is not a real record
        // TODO: Figure out when this happens and try to handle it better
        /* istanbul ignore else */
        if (record && typeof record.setPersisted === 'function') {
            record.setPersisted(true);
        }
        return record;
    };
    /**
     * Update the relationships between models
     *
     * @private
     * @param {IJsonApiRecord} obj - Object to be updated
     * @returns {void}
     *
     * @memberOf Store
     */
    Store.prototype.__updateRelationships = function (obj) {
        var _this = this;
        var record = this.find(obj.type, obj.id);
        var refs = obj.relationships ? Object.keys(obj.relationships) : [];
        refs.forEach(function (ref) {
            var items = obj.relationships[ref].data;
            if (items instanceof Array && items.length < 1) {
                // it's only possible to update items with one ore more refs. Early exit
                return;
            }
            if (items && record) {
                var models = utils_1.mapItems(items, function (_a) {
                    var id = _a.id, type = _a.type;
                    return _this.find(type, id) || id;
                });
                var itemType = items instanceof Array ? items[0].type : items.type;
                record.assignRef(ref, models, itemType);
            }
        });
    };
    /**
     * Iterate trough JSON API response models
     *
     * @private
     * @param {IJsonApiResponse} body - JSON API response
     * @param {Function} fn - Function to call for every instance
     * @returns
     *
     * @memberOf Store
     */
    Store.prototype.__iterateEntries = function (body, fn) {
        utils_1.mapItems((body && body.included) || [], fn);
        return utils_1.mapItems((body && body.data) || [], fn);
    };
    /**
     * List of Models that will be used in the collection
     *
     * @static
     *
     * @memberOf Store
     */
    Store.types = [Record_1.Record];
    /**
     * Should the cache be used for API calls when possible
     *
     * @static
     *
     * @memberof Store
     */
    Store.cache = true;
    __decorate([
        mobx_1.action
    ], Store.prototype, "sync", null);
    return Store;
}(NetworkStore_1.NetworkStore));
exports.Store = Store;
