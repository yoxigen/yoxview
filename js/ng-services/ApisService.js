angular.module('ApisModule', ["PathModule", "StateModule", "TextsModule"])
.factory('apis', function(path, state, texts) {
    var viewerApi,
        thumbnailsApi,
        albumsApi,
        homeApi;

    var viewer_view = document.getElementById("viewer_view");

    var currentAlbumId,
        currentAlbum,
        currentProvider,
        currentDataSource,
        currentFeedId;

    var eventBus = new yox.eventBus();

    function createViewerApi(itemIndexToShow){
        viewerApi = new Yox(viewer_view, {
            theme: {
                name: "classic",
                options: {
                    renderThumbnails: false,
                    renderInfo: false,
                    renderControls: false,
                    showThumbnails: false,
                    showInfo: false,
                    firstItem: itemIndexToShow,
                    modules: {
                        view: {
                            loop: false,
                            transitionTime: 0
                        }
                    }
                }
            },
            data: thumbnailsApi.data,
            events: {
                close: function(e){
                    state.back();
                },
                beforeSelect: function(e){
                    if (e.newItem){
                        state.replaceState({ view: true, itemIndex:e.newItem.id - 1});
                    }
                }
            }
        });

        albumsApi.triggerEvent("createView", { item: thumbnailsApi.data.getItem(parseInt(itemIndexToShow, 10)) });
        $("body")
            .on("focus", "textarea, input[type='text']", function(){
                viewerApi.modules.controller.disableKeyboard();
            })
            .on("blur", "textarea, input[type='text']", function(){
                viewerApi.modules.controller.enableKeyboard();
            });
    }
    function createHomeApi(){
        if (!homeApi){
            homeApi = new Yox(document.getElementById("home"), {
                theme: [
                    {
                        name: "wall",
                        options: {
                            handleResize: true,
                            thumbnailsMaxHeight: Math.round(screen.height * 0.27),
                            borderWidth: 3,
                            padding: 1,
                            scrollToElementOnSelect: true,
                            createThumbnailInfoFunc: yox.utils.support.touch() ? null : createThumbnailInfo
                        }
                    }
                ],
                data: new yox.data()
            });

            homeApi.data.loadNews();
        }
    }

    albumsApi = new Yox(document.getElementById("albumsThumbnails"), {
        theme: [
            {
                name: "wall",
                options: {
                    thumbnailsMaxHeight: Math.round(screen.height * 0.27),
                    borderWidth: 3,
                    createThumbnailInfo: true,
                    padding: 1,
                    loadItemsOnScroll: false,
                    scrollToElementOnSelect: true,
                    modules: {
                        thumbnails: {
                            createThumbnailUrl: function(item){
                                if (item.data && item.data.album)
                                    return "#album/" + item.source.sourceType.name + "/" + item.data.album.id;
                                else
                                    return "#" + item.link || item.url;
                            }
                        }
                    }
                }
            }
        ],
        data: new yox.data(),
        events: {
            click: function(e){
                var itemIndex = parseInt(e.index, 10),
                    item = albumsApi.data.getData()[0].items[itemIndex];

                if (e.originalEvent.target.nodeName !== "A"){
                    state.pushState({
                        source: item.source.sourceType,
                        feed: {
                            album: item.data.album.id,
                            user: item.author.id,
                            name: item.data.album.name
                        }
                    });
                }
            },
            openAlbum: function(){
                albumsApi.themes.wall.toggleHandleResize(false);
            },
            openFeed: function(e){
                if (e.feed.hasChildren && e.feed.childrenType === "albums"){
                    albumsApi.themes.wall.toggleHandleResize(true);
                }
            }
        }
    });

    yox.data.sources.picasa.defaults.thumbsize = 400;

    thumbnailsApi = new Yox(document.getElementById("thumbnails"), {
        theme: [
            {
                name: "wall",
                options: {
                    handleResize: false,
                    thumbnailsMaxHeight: Math.round(screen.height * 0.27),
                    borderWidth: 3,
                    padding: 1,
                    scrollToElementOnSelect: true,
                    createThumbnailInfoFunc: yox.utils.support.touch() ? null : createThumbnailInfo
                }
            }
        ],
        data: new yox.data(),
        events: {
            click: function(e){
                if (e.originalEvent.target.nodeName !== "A"){
                    state.pushState({
                        view: true,
                        itemIndex: e.index
                    });
                }
            }
        }
    });

    var titleMaxLength = 150;
    function createThumbnailInfo(item){
        var thumbnailInfo = document.createElement("div");
        thumbnailInfo.className = "yox-theme-wall-info";

        var bottomInfo = document.createElement("div");
        bottomInfo.className = "yox-theme-wall-info-bottom";
        thumbnailInfo.appendChild(bottomInfo);

        if (item.title || item.description){
            if (item.title){
                var title = document.createElement("h3");
                title.className = "yox-theme-wall-info-title";
                if (yox.utils.strings.isRtl(item.title))
                    title.dir = "rtl";

                title.innerHTML = texts.formatText(yox.utils.strings.trim(item.title, titleMaxLength, "&hellip;"), item.source.sourceType.name);
                bottomInfo.appendChild(title);
            }
        }

        var meta = document.createElement("div");
        meta.className = "yox-theme-wall-info-meta";

        if (item.social){
            var social = document.createElement("div");
            social.className = "yox-theme-wall-info-social";
            if (item.social.likesCount){
                var likes = document.createElement("span");
                likes.className = "yox-theme-wall-info-likes";
                likes.textContent = yox.utils.strings.formatNumber(item.social.likesCount);
                social.appendChild(likes);
            }
            if (item.social.commentsCount){
                var comments = document.createElement("span");
                comments.className = "yox-theme-wall-info-comments";
                comments.textContent = yox.utils.strings.formatNumber(item.social.commentsCount);
                social.appendChild(comments);
            }
            meta.appendChild(social);
        }

        if (item.author){
            if (item.author.avatar){
                var authorThumbnail = document.createElement("img");
                authorThumbnail.className = "yox-theme-wall-info-avatar";
                authorThumbnail.src = item.author.avatar;
                meta.appendChild(authorThumbnail);
            }

            if (item.author.name){
                var authorName = document.createElement("a");
                authorName.className = "yox-theme-wall-info-author userLink";
                authorName.textContent = item.author.name || item.author.username;
                authorName.setAttribute("href", ["?", item.source.sourceType.name, "user", item.author.id].join("/"));
                meta.appendChild(authorName);
            }
        }

        if (item.time){
            var time = document.createElement("span");
            time.className = "yox-theme-wall-info-time";
            time.textContent = yox.utils.date.getTimeDifference(item.time);
            meta.appendChild(time);
        }

        bottomInfo.appendChild(meta);
        return thumbnailInfo;
    }

    function getAlbumId(item){
        return (typeof(item.provider) === "string" ? item.provider : item.provider.name) + "." + item.album.id;
    }

    function enableThumbnails(){
        if (document.body.getAttribute("data-page") !== "thumbnails"){
            document.body.setAttribute("data-page", "thumbnails");
            thumbnailsApi.themes.wall.toggleHandleResize(true);
        }
    }

    function setAlbum(item){
        var albumId = getAlbumId(item);
        if (currentAlbumId !== albumId){
            setTimeout(function(){
                currentDataSource = {
                    type: item.provider.name,
                    url: item.album.url
                };

                thumbnailsApi.data.source(currentDataSource);
            }, 10);

            currentFeedId = "albums";
            currentAlbumId = albumId;
            currentAlbum = item.album;
            currentProvider = item.provider;
        }

        enableThumbnails();
    }

    function setFeed(item){
        currentFeedId = item.id;
        currentProvider = item.provider;
        if (!item.feed.hasChildren || item.feed.childrenType !== "albums"){
            enableThumbnails();
            albumsApi.themes.wall.toggleHandleResize(false);
        }
    }

    state.onFeedChange.addListener(function(e){
        if (e.feed.hasChildren)
            albumsApi.data.source(e.feed, e.onLoad);
        else
            thumbnailsApi.data.source(e.feed, e.onLoad);
    });

    state.onModeChange.addListener(function(e){
        albumsApi.themes.wall.toggleHandleResize(e.mode === "albums");
        thumbnailsApi.themes.wall.toggleHandleResize(e.mode === "thumbnails");

	    if (e.mode === "thumbnails"){
		    setTimeout(function(){
	    	    thumbnailsApi.triggerEvent("resize");
		    }, 5);
	    }
    });

    albumsApi.addEventListener("openAlbum", setAlbum);
    albumsApi.addEventListener("openFeed", setFeed);
    albumsApi.addEventListener("home", function(){
        thumbnailsApi.themes.wall.toggleHandleResize(false);
    });

    function getDataFromUrl(url){
        var queryStringMatch = url.match(/\?\/(.*)/),
            urlData,
            urlFields;

        if (queryStringMatch){
            urlData = {};
            urlFields = queryStringMatch[1].split("/");

            urlData.type = urlFields[0];
            if (urlFields.length > 1)
                urlData[urlFields[1]] = decodeURIComponent(urlFields[2]);

            return urlData;
        }

        return null;
    }

    return{
        addEventListener: eventBus.addEventListener,
        albums: albumsApi,
        createHomeApi: createHomeApi,
        removeEventListener: eventBus.removeEventListener,
        thumbnails: thumbnailsApi,
        createViewer: function(itemIndexToLoad){
            if (!viewerApi)
                createViewerApi(itemIndexToLoad);
        },
        get viewer(){
            return viewerApi;
        }
    };
});