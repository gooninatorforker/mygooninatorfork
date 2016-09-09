/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	__webpack_require__(1);
	__webpack_require__(2);

	module.exports = {};

/***/ },
/* 1 */
/***/ function(module, exports) {

	'use strict';

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
	  variableSlow: function variableMedium() {
	    return (Math.sin(Date.now() / 1000) + 1) / 2 * 2000 + 3000;
	  },
	  variableMedium: function variableMedium() {
	    return (Math.sin(Date.now() / 1000) + 1) / 2 * 1000 + 200;
	  },
	  variableFast: function variableFast() {
	    return (Math.sin(Date.now() / 1000) + 1) / 2 * 600;
	  },
	  fixed: function fixed(n) {
	    return function () {
	      return n;
	    };
	  }
	};

	var setTiming = function setTiming(e, f, id) {
	  e.preventDefault();
	  getNextDelay = f;
	  $('.timing-control').removeClass('selected');
	  $('#' + id).addClass('selected');
	};
	document.getElementById('tf-var-slow').onclick = function (e) {
	  setTiming(e, timingFunctions.variableSlow, 'tf-var-slow');
	};
	document.getElementById('tf-var-medium').onclick = function (e) {
	  setTiming(e, timingFunctions.variableMedium, 'tf-var-medium');
	};
	document.getElementById('tf-var-fast').onclick = function (e) {
	  setTiming(e, timingFunctions.variableFast, 'tf-var-fast');
	};
	document.getElementById('tf-fixed-05').onclick = function (e) {
	  setTiming(e, timingFunctions.fixed(500), 'tf-fixed-05');
	};
	document.getElementById('tf-fixed-10').onclick = function (e) {
	  setTiming(e, timingFunctions.fixed(1000), 'tf-fixed-10');
	};
	document.getElementById('tf-fixed-20').onclick = function (e) {
	  setTiming(e, timingFunctions.fixed(2000), 'tf-fixed-20');
	};
	document.getElementById('pause').onclick = function (e) {
	  e.preventDefault();
	  togglePaused();
	};

	var getParam = function getParam(name) {
	  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
	  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
	      results = regex.exec(location.search);
	  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
	};

	var getIntParam = function getIntParam(name, defaultValue) {
	  var p = getParam(name);
	  if (p) {
	    return parseInt(p, 10);
	  } else {
	    return defaultValue;
	  }
	};

	var getStringParam = function getStringParam(name, defaultValue) {
	  var p = getParam(name);
	  if (p && p.length) {
	    return p;
	  } else {
	    return defaultValue;
	  }
	};

	var getRandomIndex = function getRandomIndex(list) {
	  return Math.floor(Math.random() * list.length);
	};

	var getRandomListItem = function getRandomListItem(list) {
	  return list[getRandomIndex(list)];
	};

	var getPausesOnGifs = function getPausesOnGifs() {
	  return document.getElementById('autopauseGif').checked;
	};

	var getPausesOnLostFocus = function getPausesOnLostFocus() {
	  return document.getElementById('autopauseFocus').checked;
	};

	var getMaxImageCount = function getMaxImageCount() {
	  return document.getElementById('maxImageCount').value;
	};

	var updateDisplayCount = function updateDisplayCount() {
	  document.getElementById('count').innerHTML = queue.length;
	};

	var getNextDelay;
	if (parseInt(getParam('timing_function'), 10)) {
	  var delay = parseInt(getParam('timing_function'), 10);
	  getNextDelay = timingFunctions.fixed(delay);
	  if (delay == 500) {
	    $('#tf-fixed-05').addClass('selected');
	  }
	  if (delay == 1000) {
	    $('#tf-fixed-10').addClass('selected');
	  }
	  if (delay == 2000) {
	    $('#tf-fixed-20').addClass('selected');
	  }
	} else {
	  getNextDelay = timingFunctions[getParam('timing_function')] || timingFunctions.variableMedium;
	  if (getNextDelay == timingFunctions.variableSlow) {
	    $('#tf-var-slow').addClass('selected');
	  }
	  if (getNextDelay == timingFunctions.variableMedium) {
	    $('#tf-var-medium').addClass('selected');
	  }
	  if (getNextDelay == timingFunctions.variableFast) {
	    $('#tf-var-fast').addClass('selected');
	  }
	}

	var imageFilterName = getStringParam('image_filter', 'none');
	var imageFilterFunction = function imageFilterFunction() {
	  return true;
	};
	if (imageFilterName == 'stills_only') {
	  imageFilterFunction = function imageFilterFunction(url) {
	    return !url.endsWith('.gif');
	  };
	  console.log('stills only plz');
	} else if (imageFilterName == 'gifs_only') {
	  imageFilterFunction = function imageFilterFunction(url) {
	    return url.endsWith('.gif');
	  };
	  console.log('gifs only plz');
	}

	var API_KEY = "IErgWKUJPytXdjCqIsdNZunPeY0S1o0aXx86Rd3YHpQUhhrozz";

	var fetch = function fetch(tumblr, offset) {
	  var myUrls = URLS[tumblr];
	  var url = 'http://api.tumblr.com/v2/blog/' + tumblr + '.tumblr.com/posts?' + 'offset=' + offset + (tumblr == "iwantmygflikethis" ? '&tag=caption' : '') + (tumblr == "dorisconquered" ? '&tag=interracial' : '') + (tumblr == "whitesarethepast" ? '&tag=bbc' : '') + (tumblr == "cuckoldcaps" ? '&tag=cum+eating' : '') + (tumblr == "glamcuck" ? '&tag=caption' : '') + (tumblr == "fuckyeahfriendlyfire" ? '&tag=creampie+fucking' : '') + '&limit=20&' + 'api_key=' + API_KEY;
	  $.ajax({
	    method: 'GET',
	    cache: false,
	    dataType: 'jsonp',
	    url: url,
	    error: function error(err) {
	      console.log(err);
	    },
	    success: function success(data) {
	      if (data.meta.status != 200 || offset >= data.response.total_posts || offset > 500) {
	        return;
	      }
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
	};

	var deleteFirstImage = function deleteFirstImage() {
	  var img = queue.shift();
	  delete IMAGES[img.tumblr][img.src];
	  consumerIndex -= 1;
	  updateDisplayCount();
	};

	var startFetchImageLoop = function startFetchImageLoop(i) {
	  var fetchOneImage = function fetchOneImage() {
	    var tumblrNames = Object.keys(URLS);

	    // The image display loop consumes the queue, so just wait for it to eat
	    // enough images
	    if (tumblrNames.length < 1 || queue.length > getMaxImageCount()) {
	      return setTimeout(fetchOneImage, 300);
	    }

	    var tumblr = getRandomListItem(tumblrNames);
	    var myUrls = URLS[tumblr];
	    var myImages = IMAGES[tumblr];

	    var img = new Image();
	    var url = myUrls[getRandomIndex(Array.from(myUrls.keys()))];

	    if (!url) {
	      return setTimeout(fetchOneImage, 300);
	    }

	    img.onload = function () {
	      img.tumblr = tumblr;
	      queue.push(img);
	      updateDisplayCount();
	      fetchOneImage();
	    };
	    img.onerror = function () {
	      console.error(img.src);
	      fetchOneImage();
	    };

	    if (myImages[url]) {
	      setTimeout(fetchOneImage, 0); // limit recursion
	    } else {
	        img.src = url;
	        myImages[url] = img;
	      }
	  };
	  fetchOneImage();
	};

	for (var i = 0; i < getIntParam('num_parallel_image_loads', 5); i++) {
	  startFetchImageLoop(i);
	}

	var el = document.getElementById('img_container');

	var applyImage = function applyImage(img) {
	  var parentWidth = el.offsetWidth;
	  var parentHeight = el.offsetHeight;
	  var parentAspect = parentWidth / parentHeight;
	  var imgAspect = img.width / img.height;

	  if (imgAspect < parentAspect) {
	    var scale = parentHeight / img.height;
	    img.style.width = 'auto';
	    img.style.height = '100%';
	    img.style.marginTop = 0;
	    img.style.marginLeft = parentWidth / 2 - img.width * scale / 2 + 'px';
	  } else {
	    var scale = parentWidth / img.width;
	    img.style.height = 'auto';
	    img.style.width = '100%';
	    img.style.marginTop = parentHeight / 2 - img.height * scale / 2 + 'px';
	    img.style.marginLeft = 0;
	  }
	  if (el.firstChild) {
	    el.removeChild(el.firstChild);
	  }
	  el.appendChild(img);

	  document.getElementById('preload-text').style.display = 'none';
	};

	var showNextImage = function showNextImage() {
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

	  if (paused) {
	    return;
	  }

	  if (img.src.endsWith('gif') && getPausesOnGifs()) {
	    stop();
	  } else {
	    timer = setTimeout(showNextImage, getNextDelay());
	  }
	};

	var togglePaused = function togglePaused() {
	  if (!paused) {
	    stop();
	  } else {
	    start();
	  }
	};

	var start = function start() {
	  if (paused) {
	    document.getElementById('pause').innerHTML = "pause (space)";
	    paused = false;
	    showNextImage();
	  }
	};
	var stop = function stop() {
	  if (!paused) {
	    document.getElementById('pause').innerHTML = "play (space)";
	    paused = true;
	    clearTimeout(timer);
	  }
	};
	var goForward = function goForward() {
	  if (consumerIndex < queue.length - 2) {
	    stop();
	    consumerIndex += 1;
	    applyImage(queue[consumerIndex]);
	  } else {
	    stop();
	    start();
	  }
	};
	var goBack = function goBack() {
	  if (consumerIndex > 0) {
	    consumerIndex -= 1;
	    applyImage(queue[consumerIndex]);
	    stop();
	  }
	};

	var didPauseForBlur = false;
	$(window).blur(function () {
	  if (getPausesOnLostFocus()) {
	    didPauseForBlur = true;
	    stop();
	  }
	});
	$(window).focus(function () {
	  if (didPauseForBlur) {
	    didPauseForBlur = false;
	    start();
	  }
	});

	$(window).keypress(function (event) {
	  if (event.which == 32) {
	    // space bar
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
	} catch (e) {}

	var tumblrs = getParam('tumblrs').split(' ');
	tumblrs.map(function (tumblr) {
	  tumblr = $.trim(tumblr);
	  if (tumblr.length) {
	    if (tumblrs.length < 50) {
	      try {
	        Parse.Analytics.track('include_tumblr', { tumblr: tumblr });
	      } catch (e) {}
	    }
	    URLS[tumblr] = [];
	    IMAGES[tumblr] = {};
	    fetch(tumblr, Math.random() * 140);
	  }
	});

	showNextImage();

/***/ },
/* 2 */
/***/ function(module, exports) {

	"use strict";

	var getParam = function getParam(name) {
	  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
	  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
	      results = regex.exec(location.search);
	  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
	};

	var STYLES = {};

	var programCounter = 0;
	var PROGRAM = [];
	var BLINK_DURATION = 200;
	var BLINK_DELAY = 80;
	var BLINK_GROUP_DELAY = 1200;
	var CAPTION_DURATION = 2000;
	var CAPTION_DELAY = 1200;
	var PHRASES = [];

	var splitFirstWord = function splitFirstWord(s) {
	  var firstSpaceIndex = s.indexOf(" ");
	  if (firstSpaceIndex > 0 && firstSpaceIndex < s.length - 1) {
	    var first = s.substring(0, firstSpaceIndex);
	    var rest = s.substring(firstSpaceIndex + 1);
	    return [first, rest];
	  } else {
	    return [null, null];
	  }
	};

	var getFirstWord = function getFirstWord(s) {
	  return splitFirstWord(s)[0];
	};

	var getRest = function getRest(s) {
	  return splitFirstWord(s)[1];
	};

	var fnIntArg = function fnIntArg(innerFn) {
	  return function (value) {
	    var ms = parseInt(value, 10);
	    if (isNaN(ms)) {
	      return null;
	    }
	    return innerFn(ms);
	  };
	};

	var COMMANDS = {
	  saveStyleRules: function saveStyleRules(value) {
	    var firstWord = getFirstWord(value);
	    var style = getRest(value);
	    if (!firstWord || !style) {
	      return null;
	    }

	    STYLES[firstWord] = STYLES[firstWord] || '';
	    STYLES[firstWord] += style;

	    return function (f) {
	      f();
	    };
	  },

	  applySavedStyle: function applySavedStyle(value) {
	    return function (runNextCommand) {
	      document.getElementById('text').style.cssText = STYLES[value];
	      runNextCommand();
	    };
	  },

	  showText: function showText(value) {
	    var msString = getFirstWord(value);
	    var textString = getRest(value);
	    var ms = parseInt(msString, 10);
	    if (!textString || isNaN(ms)) {
	      return null;
	    }

	    if (textString == '$RANDOM_PHRASE') {
	      textString = getRandomListItem(PHRASES);
	    }

	    return function (runNextCommand) {
	      var el = document.getElementById('text');
	      el.style.opacity = 1.0;
	      el.innerHTML = textString;
	      setTimeout(function () {
	        el.style.opacity = 0.0;
	        runNextCommand();
	      }, ms);
	    };
	  },

	  wait: fnIntArg(function (ms) {
	    return function (runNextCommand) {
	      setTimeout(runNextCommand, ms);
	    };
	  }),

	  setBlinkDuration: fnIntArg(function (ms) {
	    return function (runNextCommand) {
	      BLINK_DURATION = ms;
	      runNextCommand();
	    };
	  }),

	  setBlinkDelay: fnIntArg(function (ms) {
	    return function (runNextCommand) {
	      BLINK_DELAY = ms;
	      runNextCommand();
	    };
	  }),

	  setBlinkGroupDelay: fnIntArg(function (ms) {
	    return function (runNextCommand) {
	      BLINK_GROUP_DELAY = ms;
	      runNextCommand();
	    };
	  }),

	  setCaptionDuration: fnIntArg(function (ms) {
	    return function (runNextCommand) {
	      CAPTION_DURATION = ms;
	      runNextCommand();
	    };
	  }),

	  setCaptionDelay: fnIntArg(function (ms) {
	    return function (runNextCommand) {
	      CAPTION_DELAY = ms;
	      runNextCommand();
	    };
	  }),

	  storePhrase: function storePhrase(value) {
	    PHRASES.push(value);
	    return function (f) {
	      f();
	    };
	  },

	  blink: function blink(value) {
	    return function (runNextCommand) {
	      var fns = [];
	      var i = 0;
	      document.getElementById('text').className = "text-blink";
	      value.split('/').map(function (word) {
	        word = $.trim(word);
	        var j = i;
	        i += 1;
	        fns.push(function () {
	          var showText = COMMANDS.showText(BLINK_DURATION + ' ' + word);
	          var wait = COMMANDS.wait('' + BLINK_DELAY);
	          showText(function () {
	            wait(fns[j + 1]);
	          });
	        });
	      });
	      var lastWait = COMMANDS.wait('' + BLINK_GROUP_DELAY);
	      fns.push(function () {
	        lastWait(runNextCommand);
	      });
	      fns[0]();
	    };
	  },

	  cap: function cap(value) {
	    var showText = COMMANDS.showText(CAPTION_DURATION + ' ' + value);
	    var wait = COMMANDS.wait('' + CAPTION_DELAY);
	    return function (runNextCommand) {
	      document.getElementById('text').className = "text-caption";
	      showText(function () {
	        wait(runNextCommand);
	      });
	    };
	  },

	  bigcap: function bigcap(value) {
	    var showText = COMMANDS.showText(CAPTION_DURATION + ' ' + value);
	    var wait = COMMANDS.wait('' + CAPTION_DELAY);
	    return function (runNextCommand) {
	      document.getElementById('text').className = "text-caption-big";
	      showText(function () {
	        wait(runNextCommand);
	      });
	    };
	  }
	};

	var run = function run() {
	  PROGRAM[programCounter](function () {
	    programCounter += 1;
	    if (programCounter >= PROGRAM.length) {
	      programCounter = 0;
	    }
	    run();
	  });
	};

	var startText = function startText(programText) {
	  var i = -1;
	  var hasError = false;
	  programText.split('\n').map(function (line) {
	    line = $.trim(line);
	    i += 1;
	    if (line.length < 1) return;

	    if (line[0] == '#') {
	      return;
	    }
	    var command = getFirstWord(line);
	    if (command) {
	      var value = getRest(line);
	      if (COMMANDS[command]) {
	        var fn = COMMANDS[command](value);
	        if (fn) {
	          PROGRAM.push(fn);
	        } else {
	          hasError = true;
	          console.error("Error on line", i, "- invalid arguments");
	        }
	      } else {
	        hasError = true;
	        console.error("Error on line", i, "- unknown command");
	      }
	    }
	  });

	  if (!hasError) {
	    run();
	  }
	};

	window.hasStartedShowingText = false;
	window.startShowingText = function () {
	  window.hasStartedShowingText = true;

	  if (getParam('textProgram') == 'test') {
	    var testProgram = document.getElementById("test_program").innerHTML;
	    startText(testProgram);
	    console.log(testProgram);
	    return;
	  }

	  if (getParam('textProgram')) {
	    var pastebinId = getParam('textProgram');
	    var url = 'https://crossorigin.me/http://pastebin.com/raw/' + pastebinId;

	    $.ajax({
	      url: url,
	      method: 'get',
	      success: function success(data) {
	        console.log(data);
	        startText(data);
	      },
	      fail: function fail(err) {
	        console.error("Could not load pastebin ID", pastebinId);
	      }
	    });
	  }
	};

/***/ }
/******/ ]);
