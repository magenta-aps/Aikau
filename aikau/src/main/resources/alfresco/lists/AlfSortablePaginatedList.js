/**
 * Copyright (C) 2005-2016 Alfresco Software Limited.
 *
 * This file is part of Alfresco
 *
 * Alfresco is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Alfresco is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Alfresco. If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * <p>This extends the [AlfHashList]{@link module:alfresco/lists/AlfHashList} to provide support
 * for common pagination and sorting behaviour. It does not render any interface for controlling
 * the current page or sort preferences - the [Paginator]{@link module:alfresco/lists/Paginator} widget
 * can be used for changing page and the number of items shown per page. Sorting can be controlled
 * through the [SortFieldSelect]{@link module:alfresco/lists/SortFieldSelect} and
 * [SortOrderToggle]{@link module:alfresco/lists/SortOrderToggle} widgets.</p>
 * 
 *  <p>It is important to understand that this widget does not perform
 * any client-side sorting or pagination, it simply controls the payloads published to services -
 * successful pagination and sorting are determined by the ability of the service and the
 * REST API ultimately called to support it.</p>
 *
 * <p>It is possible to specify the 
 * [pageSizePreferenceName]{@link module:alfresco/lists/AlfSortablePaginatedList#pageSizePreferenceName}
 * to be used by this widget (or its descendants) when the 
 * [PreferenceService]{@link module:alfresco/services/PreferenceService} is being used to set the intial
 * page size. Alternatively it can be specified by the 
 * [currentPageSize]{@link module:alfresco/lists/AlfSortablePaginatedList#currentPageSize}. Similarly 
 * the initial page number can be configured with the 
 * [currentPage]{@link module:alfresco/lists/AlfSortablePaginatedList#currentPage} attribute. Page
 * and page size data can also be derived from browser URL hash parameters when
 * [useHash]{@link module:alfresco/lists/AlfHashList#useHash} is configured to be true.</p>
 * 
 * <p>Page navigation can also be performed with infinite scrolling when
 * [useInfiniteScroll]{@link module:alfresco/lists/AlfSortablePaginatedList#useInfiniteScroll} is configured
 * to be true and either the [InfiniteScrollService]{@link module:alfresco/services/InfiniteScrollService}
 * is included in the page or the list is placed in an 
 * [InfiniteScrollArea]{@link module:alfresco/layout/InfiniteScrollArea}.</p>
 *
 * <p>The initial field to sort on can be configured with the 
 * [sortField]{@link module:alfresco/lists/AlfSortablePaginatedList#sortField} and the initial 
 * sort direction can configured by setting
 * [sortAscending]{@link module:alfresco/lists/AlfSortablePaginatedList#sortAscending} to true
 * or false as appropriate. The sort field and direction can be changed by 
 * widgets (such as menus or buttons) publishing on the
 * ["ALF_DOCLIST_SORT"]{@link module:alfresco/core/topics~SORT_LIST} topic.</p>
 *
 * @example <caption>AlfSortablePaginatedList with associated sort and pagination widgets</caption>
 * {
 *   name: "alfresco/lists/Paginator",
 *   config: {
 *     pageSizes: [5,10,20],
 *     widgetsAfter: [
 *       {
 *         name: "alfresco/lists/SortFieldSelect",
 *         config: {
 *           sortFieldOptions: [
 *             { label: "Display Name", value: "fullName" },
 *             { label: "User Name", value: "userName" }
 *           ]
 *         }
 *       },
 *       {
 *         name: "alfresco/lists/SortOrderToggle"
 *       }
 *     ]
 *   }
 * },
 * {
 *   name: "alfresco/lists/AlfSortablePaginatedList",
 *   config: {
 *     loadDataPublishTopic: "ALF_GET_USERS",
 *     currentPageSize: 10,
 *     sortField: "fullName",
 *     widgets: [
 *       {
 *         name: "alfresco/lists/views/HtmlListView"
 *       }
 *     ]
 *   }
 * }
 *
 * @module alfresco/lists/AlfSortablePaginatedList
 * @extends module:alfresco/lists/AlfHashList
 * @mixes module:alfresco/services/_PreferenceServiceTopicMixin
 * @author Dave Draper
 */
define(["dojo/_base/declare",
        "alfresco/lists/AlfHashList",
        "alfresco/services/_PreferenceServiceTopicMixin",
        "alfresco/core/topics",
        "dojo/_base/lang",
        "alfresco/util/hashUtils",
        "dojo/io-query"],
        function(declare, AlfHashList, _PreferenceServiceTopicMixin, topics, lang, hashUtils, ioQuery) {

   return declare([AlfHashList, _PreferenceServiceTopicMixin], {

      /**
       * An array of the i18n files to use with this widget. This re-uses the 
       * [Paginator]{@link module:alfresco/lists/Paginator} i18n properties.
       * 
       * @instance
       * @type {object[]}
       * @default [{i18nFile: "./i18n/Paginator.properties"}]
       */
      i18nRequirements: [{i18nFile: "./i18n/Paginator.properties"}],

      /**
       * Indicates whether pagination should be used when requesting documents (e.g. include the page number and the number of
       * results per page)
       *
       * @instance
       * @type {boolean}
       * @default
       */
      usePagination: true,

      /**
       * The current page number being shown.
       *
       * @instance
       * @type {number}
       * @default
       */
      currentPage: 1,

      /**
       * The size (or number of items) to be shown on each page.
       *
       * @instance
       * @type {number}
       * @default
       */
      currentPageSize: 25,

      /**
       * The name of the property to access in order to retrieve the page-size preference for this widget
       *
       * @instance
       * @type {string}
       * @default
       */
      pageSizePreferenceName: "org.alfresco.share.documentList.documentsPerPage",

      /**
       * The inital sort order.
       *
       * @instance
       * @type {boolean}
       * @default
       */
      sortAscending: true,

      /**
       * The initial field to sort results on. For historical reasons the default is the "cm:name"
       * property (because the DocumentLibrary was the first implementation of this capability.
       *
       * @instance
       * @type {string}
       * @default
       */
      sortField: "cm:name",

      /**
       * The initial label of the sort field. It is not necessary to set this if no other widgets require
       * it. However, it will be updated on external sort requests if a "label" attribute is provided. The
       * reason for setting it is so that other widgets (such as an 
       * [AlfMenuBarSelect]{@link module:alfresco/menus/AlfMenuBarSelect}) used to control the sort field
       * can be updated with the appropriate label.
       * 
       * @instance
       * @type {string}
       * @default
       * @since 1.0.73
       */
      sortFieldLabel: "",

      /**
       * Extends the [inherited function]{@link module:alfresco/lists/AlfList#showView} to set the sort data for
       * any [HeaderCell]{@link module:alfresco/lists/views/layouts/HeaderCell} widgets that might be included in the
       * view.
       * 
       * @instance
       * @since 1.0.59
       * @fires module:alfresco/core/topics#SORT_LIST
       */
      showView: function alfresco_lists_AlfSortablePaginatedList__showView() {
         this.inherited(arguments);
         if (!this.useHash)
         {
            this.alfLog("info", "Really should publish sort data");
            this.alfPublish(topics.SORT_LIST, {
               direction: (this.sortAscending) ? "ascending" : "descending",
               value: this.sortField,
               label: this.sortFieldLabel,
               requester: this
            });
         }
      },

      /**
       * Extends the [inherited function]{@link module:alfresco/lists/AlfList#postMixInProperties}
       * to request the users documents per page preference.
       *
       * @instance
       */
      postMixInProperties: function alfresco_lists_AlfSortablePaginatedList__postMixInProperties() {
         this.inherited(arguments);

         if (this.useHash === true)
         {
            // If using the browser URL hash, then we want to update the currentPage, currentPageSize
            // sortField, sortAscending as these are the core parameters relating to sorting and pagination
            // and they should be handled irrespective of any other hashVarsForUpdate parameters requested
            this._coreHashVars = ["currentPage","currentPageSize","sortField","sortAscending"];
         }

         this.alfServicePublish(this.getPreferenceTopic, {
            preference: this.pageSizePreferenceName,
            callback: this.setPageSize,
            callbackScope: this
         });
      },

      /**
       * Sets the number of documents per page
       *
       * @instance
       * @param {number} value The number of documents per page.
       */
      setPageSize: function alfresco_lists_AlfSortablePaginatedList__setPageSize(value) {
         if (value)
         {
            this.alfPublish(this.docsPerpageSelectionTopic, {
               label: this.message("list.paginator.perPage.label", {0: value}),
               value: value,
               selected: true
            });
         }
         this.currentPageSize = value || this.currentPageSize || 25;
      },

      /**
       * Extends the [inherited function]{@link module:alfresco/lists/AlfList#setupSubscriptions}
       * to add in additional subscriptions for the common sorting and pagination topics.
       *
       * @instance
       */
      setupSubscriptions: function alfresco_lists_AlfSortablePaginatedList__setupSubscriptions() {
         this.inherited(arguments);
         this.alfSubscribe(this.sortRequestTopic, lang.hitch(this, this.onSortRequest));
         this.alfSubscribe(this.sortFieldSelectionTopic, lang.hitch(this, this.onSortFieldSelection));
         this.alfSubscribe(this.pageSelectionTopic, lang.hitch(this, this.onPageChange));
         this.alfSubscribe(this.docsPerpageSelectionTopic, lang.hitch(this, this.onItemsPerPageChange));
      },

      /**
       * Extends the [inherited function]{@link module:alfresco/lists/AlfList#onFiltersUpdated} to ensure
       * that when a new filter is set the page is reset to the first page.
       *
       * @instance
       * @override
       */
      onFiltersUpdated: function alfresco_lists_AlfList__onFiltersUpdated() {
         this.onPageChange({
            value: 1
         });
         this.inherited(arguments);
      },

      /**
       * Checks the hash for updates relating to pagination and sorting.
       *
       * @instance
       * @param {object} hashParameters An object containing the current hash parameters
       */
      _updateCoreHashVars: function alfresco_lists_AlfSortablePaginatedList___updateCoreHashVars(hashParameters) {
         if (hashParameters.currentPage) {
            var cp = parseInt(hashParameters.currentPage, 10);
            if (!isNaN(cp))
            {
               this.currentPage = cp;
            }
         }
         if (hashParameters.currentPageSize) {
            var cps = parseInt(hashParameters.currentPageSize, 10);
            if (!isNaN(cps))
            {
               this.currentPageSize = cps;
            }
         }
         if (hashParameters.sortField) {
            this.sortField = hashParameters.sortField;
         }
         if (hashParameters.sortAscending) {
            this.sortAscending = hashParameters.sortAscending;
         }
      },

      /**
       * @instance
       * @param {object} payload The details of the request
       */
      onSortRequest: function alfresco_lists_AlfSortablePaginatedList__onSortRequest(payload) {
         /* jshint maxcomplexity:false */
         this.alfLog("log", "Sort requested: ", payload);
         if (payload && payload.requester !== this && (payload.direction !== null || payload.value !== null))
         {
            if (payload.direction)
            {
               this.sortAscending = payload.direction === "ascending";
            }
            if (payload.value)
            {
               this.sortField = payload.value;
            }
            if (payload.label)
            {
               this.sortFieldLabel = payload.label;
            }
            if (this._readyToLoad === true)
            {
               if (this.useInfiniteScroll)
               {
                  this.clearViews();
               }
               if (this.useHash === true)
               {
                  var currHash = hashUtils.getHash();
                  if (this.sortField !== null)
                  {
                     currHash.sortField = this.sortField;
                  }
                  if (this.sortAscending !== null)
                  {
                     currHash.sortAscending = this.sortAscending;
                  }
                  this.alfPublish("ALF_NAVIGATE_TO_PAGE", {
                     url: ioQuery.objectToQuery(currHash),
                     type: "HASH"
                  }, true);
               }
               else
               {
                  this.onReloadData();
               }
            }
         }
      },

      /**
       * @instance
       * @param {object} payload The details of the request
       */
      onSortFieldSelection: function alfresco_lists_AlfSortablePaginatedList__onSortFieldSelection(payload) {
         this.alfLog("log", "Sort field selected: ", payload);
         if (payload && payload.value !== null)
         {
            this.sortField = payload.value;
            if (payload.direction)
            {
               this.sortAscending = payload.direction === "ascending";
            }
            if (this._readyToLoad === true)
            {
               if (this.useInfiniteScroll)
               {
                  this.clearViews();
               }
               if (this.useHash === true)
               {
                  var currHash = hashUtils.getHash();
                  if (this.sortField !== null)
                  {
                     currHash.sortField = this.sortField;
                  }
                  if (this.sortAscending !== null)
                  {
                     currHash.sortAscending = this.sortAscending;
                  }
                  this.alfPublish("ALF_NAVIGATE_TO_PAGE", {
                     url: ioQuery.objectToQuery(currHash),
                     type: "HASH"
                  }, true);
               }
               else
               {
                  this.onReloadData();
               }
            }
         }
      },

      /**
       * @instance
       * @param {object} payload The details of the new page number
       */
      onPageChange: function alfresco_lists_AlfSortablePaginatedList__onPageChange(payload) {
         if (payload && payload.value !== null && payload.value !== this.currentPage)
         {
            if (this._readyToLoad === true) 
            {
               if (this.useHash === true)
               {
                  var currHash = hashUtils.getHash();
                  if (payload.value)
                  {
                     currHash.currentPage = payload.value;
                  }
                  this.alfPublish("ALF_NAVIGATE_TO_PAGE", {
                     url: ioQuery.objectToQuery(currHash),
                     type: "HASH"
                  }, true);
               }
               else
               {
                  this.currentPage = payload.value;
                  this.loadData();
               }
            }
         }
      },

      /**
       * Handles requests to change the number of items shown for each page of data in the list. When the page
       * size is increased or decreased the current page will be adjusted to attempt to keep the items that the
       * user was looking at in the requested page. This is simple when increasing the page size, but harder when
       * decreasing the page size. When decreasing the page size the page requested will represent the beginning
       * of the larger page size of data, e.g. when going from 50 - 25 items per page, if the user was on page 2 
       * (51-100) then page 3 (51-75) would be requested.
       * 
       * @instance
       * @param {object} payload The details of the new page size
       */
      onItemsPerPageChange: function alfresco_lists_AlfSortablePaginatedList__onItemsPerPageChange(payload) {
         if (payload && payload.value !== null && payload.value !== this.currentPageSize)
         {
            // Set the new page size, and log the previous page size for some calculations we'll do in a moment...
            var previousPageSize = this.currentPageSize;
            this.currentPageSize = payload.value;

            if (this._readyToLoad === true)
            {
               // Need to check that there is enough data available for the current page!!! e.g. if we're on page 3 and requesting page 3 will not return any results
               // Is the total number of records less than the requested docs per page multiplied by 1 less than the current page...
               // var totalRecords = lang.getObject("currentData.totalRecords", false, this);
               if (this.totalRecords !== null)
               {
                  // Figure out which page to show...
                  // e.g. form 25 per page to 100 per page = 25/100 = 0.25
                  // or   100 per page to 25 per page = 100/25 = 4
                  var factor = previousPageSize / this.currentPageSize;
                  if (factor < 1)
                  {
                     // If the factor is less 1 then it's relatively safe to assume that the new page will have 
                     // the item that the user was looking at on the page when we apply the factor to
                     // the current page (since they'll be seeing more items)...
                     this.currentPage = Math.ceil(this.currentPage * factor);
                  }
                  else
                  {
                     // If the factor is greater than 1 then the number of items that the user is going to
                     // see will be reduced and there is a risk that the item they were looking at will be on
                     // a different page. We're going to work to the principle that we will go to the beginning
                     // of the available options... e.g. reducing page size from 75 to 25 will be the equivilent
                     // of 3 pages (at 25 items per page) compared to 1 page (of 75 items) and we will show the
                     // first of those pages.
                     this.currentPage = Math.ceil(this.currentPage * factor);
                     var offset = Math.ceil(factor - 1);
                     this.currentPage = this.currentPage - offset;
                  }

                  var firstRecordOnNewPage = ((this.currentPage - 1) * this.currentPageSize) + 1;
                  while (firstRecordOnNewPage > this.totalRecords)
                  {
                     this.currentPage--;
                     firstRecordOnNewPage = ((this.currentPage - 1) * this.currentPageSize) + 1;
                  }
               }
               else
               {
                  // No need to worry. The current page is fine for the new page size so it can be set safely...
               }
               if (this.useHash === true)
               {
                  var currHash = hashUtils.getHash();
                  currHash.currentPage = this.currentPage;
                  currHash.currentPageSize = this.currentPageSize;
                  this.alfPublish("ALF_NAVIGATE_TO_PAGE", {
                     url: ioQuery.objectToQuery(currHash),
                     type: "HASH"
                  }, true);
               }
               else
               {
                  this.loadData();
               }
            }
         }
      },

      /**
       * Extends the [inherited function]{@link module:alfresco/lists/AlfList#onReloadData} to reset the
       * current page size on a reload request when [infinite scroll]{@link module:alfresco/lists/AlfList#useInfiniteScroll}
       * is enabled.
       * 
       * @instance
       */
      onReloadData: function alfresco_lists_AlfSortablePaginatedList__onReloadData() {
         if (this.useInfiniteScroll) {
            this.currentPage = 1;
         }
         this.inherited(arguments);
      },

      /**
       * Overrides the [inherited function]{@link module:alfresco/lists/AlfList#onScrollNearBottom} to request
       * more data when the user scrolls to the bottom of the browser page.
       *
       * @instance
       * @param payload
       */
      onScrollNearBottom: function alfresco_lists_AlfSortablePaginatedList__onScrollNearBottom(/*jshint unused:false*/payload) {
         // Process Infinite Scroll, if enabled & if we've not hit the end of the results
         // NOTE: The use of the currentData.totalRecords and currentData.numberFound is only retained to support
         //       AlfSearchList and faceted search in Share - generic infinite scroll should be done via the
         //       totalRecords, startIndex and currentPageSize values...
         // See AKU-1007 - we also want to prevent loading another page of data when a request is already in progress
         if(!this.requestInProgress && 
            this.useInfiniteScroll && 
            ((this.totalRecords > (this.startIndex + this.currentPageSize)) ||
            (this.currentData && (this.currentData.totalRecords < this.currentData.numberFound))))
         {
            this.currentPage++;
            this.loadData();
         }
      },

      /**
       * Extends the [inherited function]{@link module:alfresco/lists/AlfList#updateLoadDataPayload} to
       * add the additional pagination and sorting data to the supplied payload object.
       *
       * @instance
       * @param {object} payload The payload object to update
       */
      updateLoadDataPayload: function alfresco_lists_AlfSortablePaginatedList__updateLoadDataPayload(payload) {
         this.inherited(arguments);
         payload.sortAscending = (this.sortAscending === "true" || this.sortAscending === true);
         payload.sortField = this.sortField;
         if (this.usePagination || this.useInfiniteScroll)
         {
            payload.page = this.currentPage;
            payload.pageSize = this.currentPageSize;
         }
         this.alfPublish(this.docsPerpageSelectionTopic, {
            label: this.message("list.paginator.perPage.label", {0: this.currentPageSize}),
            value: this.currentPageSize,
            selected: true
         });
      },

      /**
       * Reset the pagination data.
       *
       * This method is useful, e.g., when navigation between different list views.
       *
       */
      resetPaginationData: function alfresco_lists_AlfSortablePaginatedList__resetPaginationData() {
         // This intentionally doesn't trigger an onPageChange event (we don't want to cause a data reload event).
         this.alfLog("info", "Resetting currentPage to 1");
         this.currentPage = 1;
      }
   });
});