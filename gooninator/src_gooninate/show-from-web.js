/*
  Welcome to the world of sublimely shitty JavaScript.

  1. Load all pages of the given tumblrs.
  2. Start an image loading loop ("producer") for each tumblr.
    While true...
      Wait for the consumer (the image display loop) to eat images such that
        there are less than MAX_CACHE images loaded.
      Load a random image from the tumblr. Add it to the end of the queue.
  3. Start an image display loop ("consumer").
    While true...
      If there is a new image available, display it.
      If not, choose a random image from the past MAX_CACHE images.
      Wait TIMING_FUNCTION() milliseconds.

  #2 and #3 are not simple "loops"; they are functions that call themselves
  on a delay after each iteration. At any time, the consumer loop can be paused
  or restarted. You can manipulate consumerIndex to change the "current"
  position in the queue.
*/

var URLS = {};
var IMAGES = {};
var queue = [];
var controlsHidden = false;
var paused = false;
var consumerIndex = 4;
var timer;

var timingFunctions = {
  variableSlow: function () {
      return (Math.sin(Date.now() / 1000) + 1) / 2 * 2000 + 3200;
  },
  variableSlowest: function () {
      return (Math.sin(Date.now() / 1000) + 1) / 2 * 3000 + 3500;
  },

  variableMedium: function() {
    return (Math.sin(Date.now() / 1000) + 1) / 2 * 1000 + 200;
  },
  variableFast: function() {
    return (Math.sin(Date.now() / 1000) + 1) / 2 * 600;
  },
  fixed: function(n) {
    return function() { return n; }
  }
};

var setTiming = function(e, f, id) {
  e.preventDefault();
  getNextDelay = f;
  $('.timing-control').removeClass('selected');
  $('#' + id).addClass('selected');
}
document.getElementById('tf-var-slow').onclick = function(e) {
  setTiming(e, timingFunctions.variableSlow, 'tf-var-slow');
}
document.getElementById('tf-var-slowest').onclick = function(e) {
  setTiming(e, timingFunctions.variableSlowest, 'tf-var-slowest');
}
document.getElementById('tf-var-medium').onclick = function(e) {
  setTiming(e, timingFunctions.variableMedium, 'tf-var-medium');
}
document.getElementById('tf-var-fast').onclick = function(e) {
  setTiming(e, timingFunctions.variableFast, 'tf-var-fast');
}
document.getElementById('tf-fixed-05').onclick = function(e) {
  setTiming(e, timingFunctions.fixed(500), 'tf-fixed-05');
}
document.getElementById('tf-fixed-10').onclick = function(e) {
  setTiming(e, timingFunctions.fixed(1000), 'tf-fixed-10');
}
document.getElementById('tf-fixed-20').onclick = function(e) {
  setTiming(e, timingFunctions.fixed(2000), 'tf-fixed-20');
}
document.getElementById('pause').onclick = function(e) {
  e.preventDefault();
  togglePaused();
}

var getParam = function(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
};

var getIntParam = function(name, defaultValue) {
  var p = getParam(name);
  if (p) {
    return parseInt(p, 10);
  } else {
    return defaultValue;
  }
}

var getStringParam = function(name, defaultValue) {
  var p = getParam(name);
  if (p && p.length) {
    return p;
  } else {
    return defaultValue;
  }
}

var getRandomIndex = function(list) {
  return Math.floor(Math.random()*list.length)
};

var getRandomListItem = function(list) {
  return list[getRandomIndex(list)];
};

var getPausesOnGifs = function() {
  return document.getElementById('autopauseGif').checked;
}

var getPausesOnLostFocus = function() {
  return document.getElementById('autopauseFocus').checked;
}

var getMaxImageCount = function() {
  return document.getElementById('maxImageCount').value;
}

var updateDisplayCount = function() {
  document.getElementById('count').innerHTML = queue.length;
}

var getNextDelay;
if (parseInt(getParam('timing_function'), 10)) {
  var delay = parseInt(getParam('timing_function'), 10);
  getNextDelay = timingFunctions.fixed(delay);
  if (delay == 500) { $('#tf-fixed-05').addClass('selected'); }
  if (delay == 1000) { $('#tf-fixed-10').addClass('selected'); }
  if (delay == 2000) { $('#tf-fixed-20').addClass('selected'); }
} else {
  getNextDelay = timingFunctions[getParam('timing_function')] || timingFunctions.variableMedium;
  if (getNextDelay == timingFunctions.variableSlow) {
    $('#tf-var-slow').addClass('selected');
  }
  if (getNextDelay == timingFunctions.variableSlowest) {
    $('#tf-var-slowest').addClass('selected');
  }
  if (getNextDelay == timingFunctions.variableMedium) {
    $('#tf-var-medium').addClass('selected');
  }
  if (getNextDelay == timingFunctions.variableFast) {
    $('#tf-var-fast').addClass('selected');
  }
}

var imageFilterName = getStringParam('image_filter', 'none');
var imageFilterFunction = function() { return true; }
if (imageFilterName == 'stills_only') {
  imageFilterFunction = function(url) { return !url.endsWith('.gif') }
  console.log('stills only plz');
} else if (imageFilterName == 'gifs_only') {
  imageFilterFunction = function(url) { return url.endsWith('.gif') }
  console.log('gifs only plz');
}

var API_KEY = getParam('api_key') || "ibaCX5l0qYQWVhkMCmtVuJ1sYoKv8WBP9uZZV6SaJc2dySFQ4M";

var fetch = function(tumblr, offset) {
  var myUrls = URLS[tumblr];
  var url = (
    'http://api.tumblr.com/v2/blog/' + tumblr + '.tumblr.com/posts?' +
    'offset=' + offset + '&limit=20&' +
    'api_key=' + API_KEY
  );
  $.ajax({
    method: 'GET',
    cache: false,
    dataType: 'jsonp',
    url: url,
    error: function(err) {
      console.log(err);
    },
    success: function(data) {
      if (data.meta.status != 200 || offset >= data.response.total_posts || offset > 500) { return; }
      for (var i = 0; i < data.response.posts.length; i++) {
        var post = data.response.posts[i];
        if (post.photos) {
          for (var j = 0; j < post.photos.length; j++) {
            var photo = post.photos[j];
            var url = photo.original_size.url;
            var isSizeOk = photo.original_size.width > getIntParam('min_image_width', 500) || url.endsWith('.gif');
            if (isSizeOk && imageFilterFunction(url)) {
              myUrls.push(photo.original_size.url);
            }
          }
        }
      }
      fetch(tumblr, offset + 20);
    }
  });
}

var deleteFirstImage = function() {
  var img = queue.shift();
  delete IMAGES[img.tumblr][img.src];
  consumerIndex -= 1;
  updateDisplayCount();
}

var startFetchImageLoop = function(i) {
  var fetchOneImage = function() {
    var tumblrNames = Object.keys(URLS);

    // The image display loop consumes the queue, so just wait for it to eat
    // enough images
    if (tumblrNames.length < 1 || queue.length > getMaxImageCount()) {
      return setTimeout(fetchOneImage, 300)
    }

    var tumblr = getRandomListItem(tumblrNames);
    var myUrls = URLS[tumblr];
    var myImages = IMAGES[tumblr];

    var img = new Image()
    var url = myUrls[getRandomIndex(Array.from(myUrls.keys()))];

    if (!url) {
      return setTimeout(fetchOneImage, 300);
    }

    img.onload = function() {
      img.tumblr = tumblr;
      queue.push(img);
      updateDisplayCount();
      fetchOneImage();
    }
    img.onerror = function() {
      console.error(img.src);
      fetchOneImage();
    }

    if (myImages[url]) {
      setTimeout(fetchOneImage, 0);  // limit recursion
    } else {
      img.src = url;
      myImages[url] = img;
    }
  }
  fetchOneImage();
}


for (var i=0; i<getIntParam('num_parallel_image_loads', 5); i++) {
  startFetchImageLoop(i);
}


var el = document.getElementById('img_container');

var applyImage = function(img){
  var parentWidth = el.offsetWidth;
  var parentHeight = el.offsetHeight
  var parentAspect = parentWidth / parentHeight;
  var imgAspect = img.width / img.height;

  if (imgAspect < parentAspect) {
    var scale = parentHeight / img.height;
    img.style.width = 'auto';
    img.style.height = '100%';
    img.style.marginTop = 0;
    img.style.marginLeft = (parentWidth / 2 - img.width * scale / 2) + 'px';
  } else {
    var scale = parentWidth / img.width;
    img.style.height = 'auto';
    img.style.width = '100%';
    img.style.marginTop = (parentHeight / 2 - img.height * scale / 2) + 'px';
    img.style.marginLeft = 0;
  }
  if (el.firstChild) {
    el.removeChild(el.firstChild);
  }
  el.appendChild(img);

  document.getElementById('preload-text').style.display = 'none';
}

var showNextImage = function() {
  // Wait for enough content
  if (queue.length < 5) {
    setTimeout(showNextImage, getNextDelay());
    return;
  }
  if (!window.hasStartedShowingText && window.startShowingText) {
    window.startShowingText();
  }
  var tumblr = queue[queue.length - 1];

  consumerIndex += 1;

  var img;
  if (consumerIndex >= queue.length) {
    img = getRandomListItem(queue);
    consumerIndex = queue.length - 1;
  } else {
    img = queue[consumerIndex];
  }

  applyImage(img);

  if (queue.length > getMaxImageCount()) {
    deleteFirstImage();
  }

  if (paused) { return; }

  if (img.src.endsWith('gif') && getPausesOnGifs()) {
    stop();
  } else {
    timer = setTimeout(showNextImage, getNextDelay());
  }
};

var togglePaused = function (){
  if (!paused){
   stop();
  } else {
    start();
  }
} 

var start = function (){
  if (paused) {
    document.getElementById('pause').innerHTML = "pause (space)";
    paused = false;
    showNextImage();
  }
}
var stop = function (){
  if (!paused){
   document.getElementById('pause').innerHTML = "play (space)";
   paused = true;
   clearTimeout(timer);
  }
}
var goForward = function(){
  if (consumerIndex < queue.length - 2) {
    stop();
    consumerIndex += 1;
    applyImage(queue[consumerIndex]);
  } else {
    stop();
    start();
  }
}
var goBack = function(){
  if (consumerIndex > 0) {
    consumerIndex -= 1;
    applyImage(queue[consumerIndex]);
    stop();
  }
}

var didPauseForBlur = false
$(window).blur(function() {
  if (getPausesOnLostFocus()) {
    didPauseForBlur = true;
    stop();
  }
});
$(window).focus(function() {
  if (didPauseForBlur) {
    didPauseForBlur = false;
    start();
  }
});

$(window).keypress(function(event) {
  if (event.which == 32) {  // space bar
     togglePaused();
  } else if (event.keyCode == 39 || event.keyCode == 100) {
    goForward();
  } else if (event.keyCode == 37 || event.keyCode == 97) {
    goBack();
  }
});

/* run */

try {
  Parse.initialize("WDCAKzTnimGMvekXC9jYEXcWtkJIuRcpKcT4pE2W", "U57oA8RIvJwffesaZj61VY9VsI1LMOFXJaUBBwJQ");

  Parse.Analytics.track('gooninate', {
    tumblrs: getParam('tumblrs'),
    timingFunction: getParam('timing_function')
  });

  Parse.Analytics.track('include_tumblr_combo', {
    tumblrs: getParam('tumblrs')
  });

  Parse.Analytics.track('use_timing_function', {
    tumblrs: getParam('timing_function')
  });
} catch (e) {

}

var tumblrs = getParam('tumblrs').split(' ');
tumblrs.map(function(tumblr) {
  tumblr = $.trim(tumblr);
  if (tumblr.length) {
    if (tumblrs.length < 50) {
      try {
        Parse.Analytics.track('include_tumblr', {tumblr: tumblr});
      } catch (e) {

      }
    }
    URLS[tumblr] = [];
    IMAGES[tumblr] = {};
    fetch(tumblr, 0);
  }
});

showNextImage();
