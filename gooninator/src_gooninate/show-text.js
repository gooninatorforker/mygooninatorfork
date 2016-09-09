var getParam = function(name) {
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

var splitFirstWord = function(s) {
  var firstSpaceIndex = s.indexOf(" ");
  if (firstSpaceIndex > 0 && firstSpaceIndex < s.length - 1) {
    var first = s.substring(0, firstSpaceIndex);
    var rest = s.substring(firstSpaceIndex + 1);
    return [first, rest];
  } else {
    return [null, null];
  }
}

var getFirstWord = function(s) {
  return splitFirstWord(s)[0];
}

var getRest = function(s) {
  return splitFirstWord(s)[1];
}

var fnIntArg = function(innerFn) {
  return function(value) {
    var ms = parseInt(value, 10);
    if (isNaN(ms)) { return null; }
    return innerFn(ms);
  };
}

var COMMANDS = {
  saveStyleRules: function(value) {
    var firstWord = getFirstWord(value);
    var style = getRest(value);
    if (!firstWord || !style) { return null; }

    STYLES[firstWord] = STYLES[firstWord] || '';
    STYLES[firstWord] += style;

    return function(f) { f() };
  },

  applySavedStyle: function(value) {
    return function(runNextCommand) {
      document.getElementById('text').style.cssText = STYLES[value];
      runNextCommand();
    }
  },

  showText: function(value) {
    var msString = getFirstWord(value);
    var textString = getRest(value);
    var ms = parseInt(msString, 10);
    if (!textString || isNaN(ms)) { return null; }

    if (textString == '$RANDOM_PHRASE') {
      textString = getRandomListItem(PHRASES);
    }

    return function(runNextCommand) {
      var el = document.getElementById('text')
      el.style.opacity = 1.0;
      el.innerHTML = textString;
      setTimeout(function() {
        el.style.opacity = 0.0;
        runNextCommand();
      }, ms);
    }
  },

  wait: fnIntArg(function(ms) {
    return function(runNextCommand) { setTimeout(runNextCommand, ms); }
  }),

  setBlinkDuration: fnIntArg(function(ms) {
    return function(runNextCommand) {
      BLINK_DURATION = ms;
      runNextCommand();
    }
  }),

  setBlinkDelay: fnIntArg(function(ms) {
    return function(runNextCommand) {
      BLINK_DELAY = ms;
      runNextCommand();
    }
  }),

  setBlinkGroupDelay: fnIntArg(function(ms) {
    return function(runNextCommand) {
      BLINK_GROUP_DELAY = ms;
      runNextCommand();
    }
  }),

  setCaptionDuration: fnIntArg(function(ms) {
    return function(runNextCommand) {
      CAPTION_DURATION = ms;
      runNextCommand();
    }
  }),

  setCaptionDelay: fnIntArg(function(ms) {
    return function(runNextCommand) {
      CAPTION_DELAY = ms;
      runNextCommand();
    }
  }),

  storePhrase: function(value) {
    PHRASES.push(value);
    return function(f) { f() };
  },

  blink: function(value) {
    return function(runNextCommand) {
      var fns = [];
      var i = 0;
      document.getElementById('text').className = "text-blink";
      value.split('/').map(function(word) {
        word = $.trim(word);
        var j = i;
        i += 1;
        fns.push(function() {
          var showText = COMMANDS.showText(BLINK_DURATION + ' ' + word);
          var wait = COMMANDS.wait('' + BLINK_DELAY);
          showText(function() { wait(fns[j + 1]); });
        })
      });
      var lastWait = COMMANDS.wait('' + BLINK_GROUP_DELAY);
      fns.push(function() {
        lastWait(runNextCommand);
      });
      fns[0]();
    }
  },

  cap: function(value) {
    var showText = COMMANDS.showText(CAPTION_DURATION + ' ' + value);
    var wait = COMMANDS.wait('' + CAPTION_DELAY);
    return function(runNextCommand) {
      document.getElementById('text').className = "text-caption";
      showText(function() { wait(runNextCommand); });
    }
  },

  bigcap: function(value) {
    var showText = COMMANDS.showText(CAPTION_DURATION + ' ' + value);
    var wait = COMMANDS.wait('' + CAPTION_DELAY);
    return function(runNextCommand) {
      document.getElementById('text').className = "text-caption-big";
      showText(function() { wait(runNextCommand); });
    }
  }
}

var run = function() {
  PROGRAM[programCounter](function() {
    programCounter += 1;
    if (programCounter >= PROGRAM.length) {
      programCounter = 0;
    }
    run();
  })
}


var startText = function(programText) {
  var i = -1;
  var hasError = false;
  programText.split('\n').map(function(line) {
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

  if (!hasError) { run(); }
}


window.hasStartedShowingText = false
window.startShowingText = function() {
  window.hasStartedShowingText = true

  if (getParam('textProgram') == 'test') {
    var testProgram = document.getElementById("test_program").innerHTML
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
      success: function(data) {
        console.log(data);
        startText(data);
      },
      fail: function(err) {
        console.error("Could not load pastebin ID", pastebinId)
      },
    })
  }
};