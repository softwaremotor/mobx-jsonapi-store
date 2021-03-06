# JSON API support status

[Milestone for the spec compliance](https://github.com/infinum/mobx-jsonapi-store/milestone/1)

Based on the official v1.0 [specification](http://jsonapi.org/format/), here is the status of every feature:

## [Content Negotiation](http://jsonapi.org/format/#content-negotiation)

### [Client Responsibilities](http://jsonapi.org/format/#content-negotiation-clients)
* The lib is already setting the required headers, but you can also extend/override them if needed ✅

### [Server Responsibilities](http://jsonapi.org/format/#content-negotiation-servers)
* If the server returns any HTTP status 400 or greater (including 406 and 415 mentioned in the spec), the request promise will reject. ✅

## [Document Structure](http://jsonapi.org/format/#document-structure)

### [Top Level](http://jsonapi.org/format/#document-top-level)
* The lib supports `data`, `errors`, `meta`, `links` and `included` properties. It will ignore `jsonapi` property for now. ✅

### [Resource Objects](http://jsonapi.org/format/#document-resource-objects)
* The lib expects `id` and `type` ✅
* If the resource has `attributes`, they will be added to the record ✅
* If the resource has `relationships`
  * `links` will be available using the `getRelationshipLinks()` method on the record ✅
    * Use `fetchRelationshipLink(relationship, link)` to fetch the link ✅
  * `data` will be used to build the references between models
    * If the store already contains the referenced model or `includes` contains the model it will be available right away on the record: `record[relName]`. Also, the id is available on `record[relName + 'Id']`. ✅
    * If the model is "unknown", the id will be available on  `record[relName + 'Id']`. ✅
  * `meta` is available on `record[relName + 'Meta']` ✅
* If the resource has `links` or `meta`, they will be available with the `getLinks()` and `getMeta()` methods on the record ✅
  * Use `fetchLink(link)` to fetch the link ✅

### [Resource Identifier Objects](http://jsonapi.org/format/#document-resource-identifier-objects)
* The lib expects `id` and `type` ✅
* `meta` is available on `record[relName + 'Meta']` ✅

### [Compound Objects](http://jsonapi.org/format/#document-compound-documents)
* The lib supports `included` property ✅
* The lib will add `included` resources as references to the `data` resources ✅
* The `included` resources are treated as regular records, just like the `data` resources, with same features and limitations ✅

### [Meta Information](http://jsonapi.org/format/#document-meta)
* The `meta` property will be available directly on the `Response` object ✅

### [Links](http://jsonapi.org/format/#document-links)
* The `links` property is supported, and exposes all links directly on the `Response` object ✅
* They are also available in raw form as a `links` property on the `Response` object ✅
* `response[linkName]` is a Promise that will resolve to the link content or reject with an error. In both cases, it will be a `Response` object ✅
  * The link is lazily evaluated, so the request won't be made until you access the property
  * The link can be a string with an URL ✅

### [JSON API Object](http://jsonapi.org/format/#document-jsonapi-object)
* The `jsonapi` property is available on `response.jsonapi` ✅

### [Member Names](http://jsonapi.org/format/#document-member-names)
* All member names are treated as strings, therefore adhere to the specification ✅
* If a name is not a valid variable name, e.g. `"first-name"`, you can access it as `record['first-name']` ✅

## [Fetching Data](http://jsonapi.org/format/#fetching)

### [Fetching Resources](http://jsonapi.org/format/#fetching-resources)
* Fetch top-level `links` ✅
* Fetch resource-level `links` with `record.fetchLink(link)` ✅
* Fetch `related` link from relationship-level `links` with `record.fetchRelationshipLink(relationship, link)` ✅

### [Fetching Relationships](http://jsonapi.org/format/#fetching-relationships)
* Fetch relationship-level `links` with `record.fetchRelationshipLink(relationship, link)` ✅

### [Inclusion of Related Resources](http://jsonapi.org/format/#fetching-includes)
* Supported since version 3.4.0 [#15](https://github.com/infinum/mobx-jsonapi-store/issues/15) ✅

### [Sparse Fieldsets](http://jsonapi.org/format/#fetching-sparse-fieldsets)
* Supported since version 3.4.0 [#16](https://github.com/infinum/mobx-jsonapi-store/issues/16) ✅

### [Sorting](http://jsonapi.org/format/#fetching-sorting)
* Supported since version 3.4.0 [#17](https://github.com/infinum/mobx-jsonapi-store/issues/17) ✅

### [Pagination](http://jsonapi.org/format/#fetching-pagination)
* The lib supports top-level links ✅
* The lib allows access to raw links with `response.links` ✅
* The lib allows pagination with links, e.g. `response.next` will return a Promise that will resolve to the link content or reject with an error. In both cases, it will be a `Response` object ✅
  * The link is lazily evaluated, so the request won't be made until you access the property

### [Filtering](http://jsonapi.org/format/#fetching-filtering)
* Supported since version 3.4.0 [#18](https://github.com/infinum/mobx-jsonapi-store/issues/18) ✅

## [Creating, Updating and Deleting Resources](http://jsonapi.org/format/#crud)

### [Creating Resources](http://jsonapi.org/format/#crud-creating)
* Creating resources is supported using the `save()` method on the record if the record was created on the client ✅
* Client-Generated IDs are supported - just make sure you're using a valid UUID generator ✅

### [Updating Resources](http://jsonapi.org/format/#crud-updating)
* Updating resources is supported using the `save()` method on the record if the record was not created on the client ✅

### [Updating Relationships](http://jsonapi.org/format/#crud-updating-relationships)
* Direct update of relationships ✅

### [Deleting Resources](http://jsonapi.org/format/#crud-deleting)
* The resource can be deleted with the `remove()` method on the record ✅

## [Query Parameters](http://jsonapi.org/format/#query-parameters)
* All current communication with the server is using the required naming method ✅

## [Errors](http://jsonapi.org/format/#errors)

### [Processing Errors](http://jsonapi.org/format/#errors-processing)
* The lib will process all HTTP status 400+ as errors ✅

### [Error Objects](http://jsonapi.org/format/#error-objects)
* The error objects will be available in the `Response` object under the `error` property (without any modification) ✅
