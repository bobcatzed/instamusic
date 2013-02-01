require([
  '$api/models',
  '$api/search',
  '$views/image#Image',
], function(Models, Search, Image) {

  function InstaMusic() {
    var self = this;
    
    //self.HOST = "http://localhost:8080"; 
    self.HOST = "https://instamusik.appspot.com";
    self.INTERVAL = 5 * 60 * 1000;
    
    Models.session.load('user').done(function(session) {
      session.user.load('identifier').done(function(user) {
        self.USER = Models.session.user.identifier;
        self.BOOKMARKLET = "javascript:"
                    + "function addjs(f,c){var e=document.createElement('scr'+'ipt');e.type='text/javascript';"
                    + "e.src=f;if(typeof(e)!=='undefined'){if(c){e.onloadDone=false;e.onload=function()"
                    + "{e.onloadDone=true;c()};e.onReadystatechange=function(){if(e.readyState==='loaded'&&!e.onloadDone)"
                    + "{e.onloadDone=true;c()}}}document.getElementsByTagName('head')[0].appendChild(e)}};"
                    + "addjs('" + self.HOST + "/js/bookmarklet.js', function() {"
                    + "var s = sel(document); var l = window.location.href; var u = '" + self.HOST + "/add';"
                    + "var c = 'url=' + encodeURIComponent(l) + '&user=" + self.USER + "' + (s ? '&text=' + encodeURIComponent(s) :"
                    + "'&content=' + encodeURIComponent(document.head.innerHTML + document.body.innerHTML));"
                    + "sav(u,c);});void(0);";

        self.init();  
      });
    });
  }

  $ = InstaMusic;
  _ = $.prototype;

  _.init = function() {
    console.log("init");
    
    this.setupBookmarklet();
    localStorage.lastfetched = 0;
    this.syncNotes(); 
    this.setupEventListeners();
  };

  _.setupEventListeners = function() { 
    var self = this;

    Models.application.addEventListener('activate', function(event) {
      console.log("application activated");
    
      self.syncNotes();
      self.interval_id = setInterval(function(){self.syncNotes()}, self.INTERVAL);
    });

    Models.application.addEventListener('deactivate', function(event) {
      console.log("application de-activated");
    
      clearInterval(self.interval_id);    
    });

    Models.application.addEventListener('arguments', function(event) {
      var arg = Models.application.arguments[0];
 
      var sections = document.getElementsByClassName('section');
      for (var i = 0; i < sections.length; i++) {
          sections[i].style.display = 'none';
      }

      var current = document.getElementById(arg); 
      current.style.display = 'block';
    });

    Models.application.addEventListener('dropped', function(event) {
      var link = Models.application.dropped[0].uri;

      self.showNote(link, link);
      self.addNote(link);
    });
  };

  _.setupBookmarklet = function() {
    var bookmarklet = document.getElementById("bookmarklet");
    bookmarklet.href = this.BOOKMARKLET; 
  };

  _.showNote = function(link, original_url) {
    console.log("Adding link: '" + link + "'");
    var self = this;

    if (!document.getElementById(link)) {
      var parts = link.split(':');
      var type = parts[1]; 

      if (type === 'track') {
        var track = Models.Track.fromURI(link); 
        self.showTrackNote(track, original_url);
      } else if (type === 'album') {
        var album = Models.Album.fromURI(link);
        self.showAlbumNote(album, original_url);
      } else if (type === 'artist') {
        var artist =  Models.Artist.fromURI(link);
        self.showArtistNote(artist, original_url);
      } else if (type === 'user' && parts[3] === 'playlist') {
        var playlist = Models.Playlist.fromURI(link);
        self.showPlaylistNote(playlist, original_url);
      } else if (type === 'search') {
        self.showSearchNote(link, original_url);
      }
    }
  };

  _.showTrackNote = function(track, url) {
    var root = document.getElementById("root");
    
    var note = document.createElement("li");
    note.id = track.uri;
    root.appendChild(note);
    
    var self = this;
    var closebutton = this.createCloseButton(function(event) {
      root.removeChild(note);
      self.deleteNote(track.uri);
    });    
    note.appendChild(closebutton);
    
    track.load('name', 'artists').done(function(track) {
      var player = Image.forTrack(track, {'player': true, 'width': 80, 'height': 80, 'link': track.uri});
      note.appendChild(player.node);

      var icon = self.createIcon("images/track.png");
      note.appendChild(icon);
 
      var title = self.createTitle(track.name, track.uri);
      note.appendChild(title);
  
      var subtitle = self.createSubTitle(track.artists[0].name, track.artists[0].uri);
      note.appendChild(subtitle);
    });

    if (url.indexOf("http") == 0) {
      var infolink = this.createInfoLink(url);
      note.appendChild(infolink);
    }
  };

  _.showAlbumNote = function(album, url) {
    var root = document.getElementById("root");
    
    var note = document.createElement("li");
    note.id = album.uri;
    root.appendChild(note);
    
    var self = this; 
    var closebutton = this.createCloseButton(function(event) {
      root.removeChild(note);
      self.deleteNote(album.uri);
    });    
    note.appendChild(closebutton);
   
    album.load('name', 'artists').done(function(album) { 
      var player = Image.forAlbum(album, {'player': true, 'width': 80, 'height': 80, 'link': album.uri}); 
      note.appendChild(player.node);

      var icon = self.createIcon("images/album.png");
      note.appendChild(icon);
 
      var title = self.createTitle(album.name, album.uri);
      note.appendChild(title);
    
      var subtitle = self.createSubTitle(album.artists[0].name, album.artists[0].uri);
      note.appendChild(subtitle);
    });

    if (url.indexOf("http") == 0) {
      var infolink = this.createInfoLink(url);
      note.appendChild(infolink);
    }
  };

  _.showArtistNote = function(artist, url) {
    var root = document.getElementById("root");
    
    var note = document.createElement("li");
    note.id = artist.uri;
    root.appendChild(note);
   
    var self = this; 
    var closebutton = this.createCloseButton(function(event) {
      root.removeChild(note);
      self.deleteNote(artist.uri);
    });    
    note.appendChild(closebutton);
   
    artist.load('name').done(function(artist) { 
      var player = Image.forArtist(artist, {'player': true, 'width': 80, 'height': 80, 'link': artist.uri});
      note.appendChild(player.node);
    
      var icon = self.createIcon("images/artist.png");
      note.appendChild(icon);
    
      var title = self.createTitle(artist.name, artist.uri);
      note.appendChild(title);
    });

    if (url.indexOf("http") == 0) {
      var infolink = this.createInfoLink(url);
      note.appendChild(infolink);
    }
  };

  _.showPlaylistNote = function(playlist, url) {
    var root = document.getElementById("root");
    
    var note = document.createElement("li");
    note.id = playlist.uri;
    root.appendChild(note);
    
    var self = this;    
    var closebutton = this.createCloseButton(function(event) {
      root.removeChild(note);
      self.deleteNote(playlist.uri);
    });    
    note.appendChild(closebutton);
   
    playlist.load('name', 'owner').done(function(playlist) { 
      var player = Image.forPlaylist(playlist, {'player': true, 'width': 80, 'height': 80, 'link': playlist.uri});
      note.appendChild(player.node);
    
      var icon = self.createIcon("images/playlist.png");
      note.appendChild(icon);

      var title = self.createTitle(playlist.name, playlist.uri);
      note.appendChild(title);

      playlist.owner.load('name').done(function(owner) { 
        var subtitle = self.createSubTitle(owner.name, owner.uri);
        note.appendChild(subtitle);
      });
    });

    if (url.indexOf("http") == 0) {
      var infolink = this.createInfoLink(url);
      note.appendChild(infolink);
    }
  };

  _.showSearchNote = function(search_uri, url) {
    var self = this;
    var root = document.getElementById("root");
    
    var note = document.createElement("li");
    note.id = search_uri;
    root.appendChild(note);
    
    var closebutton = this.createCloseButton(function(event) {
      root.removeChild(note);
      self.deleteNote(search_uri);
    });    
    note.appendChild(closebutton);
    
    var searchtext = search_uri.split('search:')[1].replace(/\+/g, ' ');
    var search = Search.Search.search(searchtext);
    search.tracks.snapshot(0, 12).done(function(snapshot) {
      Models.Playlist.createTemporary().done(function(playlist) {
        playlist.load('tracks').done(function() {
          playlist.tracks.add(snapshot.toArray());

          var player = Image.forPlaylist(playlist, {'player': true, 'width': 80, 'height': 80, 'link': search_uri});
          note.appendChild(player.node);
          
          var title = self.createTitle('"' + searchtext + '"', search_uri);
          note.appendChild(title);
        });
      });      
    });
 
    var icon = this.createIcon("images/search.png");
    note.appendChild(icon);   
    
    if (url.indexOf("http") == 0) {
      var infolink = this.createInfoLink(url);
      note.appendChild(infolink);
    }
  };

  _.syncNotes = function() {
    var self = this;
    var req = new XMLHttpRequest();
    console.log(this.HOST + "/get?timestamp=" + localStorage.lastfetched + "&user=" + this.USER);
    req.open("GET", this.HOST + "/get?timestamp=" + localStorage.lastfetched + "&user=" + this.USER, true);
    req.onreadystatechange = function() {
      if (req.readyState == 4) {
        if (req.status == 200) {
          console.info(req.responseText);
          var notes = eval(req.responseText);
          notes.forEach(function(note) {
            console.info(note["spotify-link"]);
            link = decodeURI(note["spotify-link"]);
            if (link.indexOf("spotify:") == 0)
              self.showNote(link, note["original-url"]);
          });
        }
      }
    };
    req.send();
    
    localStorage.lastfetched = Date.now()/1000;
  };

  _.addNote = function(uri) {
    var req = new XMLHttpRequest();
    req.open("GET", this.HOST + "/add?url=" + uri + "&user=" + this.USER, true);
    req.send();
  };

  _.deleteNote = function(uri) {
    var req = new XMLHttpRequest();
    req.open("GET", this.HOST + "/rem?url=" + uri + "&user=" + this.USER, true);
    req.send();
  };

  _.createTitle = function(title, url) {
    title = title.length > 40 ? title.substring(0, 40) + "..." : title;
    var element = document.createElement("div");
    element.className = "title";
    
    var link = document.createElement("a");
    link.innerText = this.unescape(title);
    link.href = url;
    element.appendChild(link);
    
    return element;
  };

  _.createSubTitle = function(title, url) {
    title = title.length > 40 ? title.substring(0, 40) + "..." : title;
    var element = document.createElement("div");
    element.className = "subtitle";
    
    var link = document.createElement("a");
    link.innerText = this.unescape(title);
    link.href = url;
    element.appendChild(link);
    
    return element;
  };

  _.createIcon = function(image_src) {
    var icon = document.createElement("img");
    icon.src = image_src;
    icon.className = "icon"; 

    return icon;
  };

  _.createCloseButton = function(close_function) {
    var closebutton = document.createElement("div");
    closebutton.className = "close-button";
    closebutton.innerText = "[X]";
    closebutton.onclick = close_function;
    
    return closebutton;
  };

  _.createInfoLink = function(url) {
    var infolink = document.createElement("a");
    infolink.className = "infolink";
    infolink.href = url;
    infolink.innerHTML = "More >> ";
    
    return infolink;
  };

  _.unescape = function(string) {
    var div = document.createElement('div');
    div.innerHTML = string;
    
    return div.firstChild.nodeValue;
  };

  //
  // Create the InstaMusic app and set it up.
  //

  var instamusic = new InstaMusic();
});
