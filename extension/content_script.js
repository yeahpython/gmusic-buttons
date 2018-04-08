console.log = function() {}

var DEFAULT_SELECTOR = "[data-id='shuffle-my-library']"
var LOAD_CHECKING_SELECTOR = DEFAULT_SELECTOR;

var visible = true;

$(window).focus(function() {
  visible = true;
  sendStatusIfChanged(true);
});

$(window).blur(function() {
  visible = false;
  sendStatusIfChanged(true);
});

function song_is_selected() {
  return ($("#currently-playing-title").length !== 0);
}

// Keep on spamming that shuffle button until something starts
function try_to_shuffle() {
  if (!song_is_selected()) {
    $(DEFAULT_SELECTOR).click();
    setTimeout(try_to_shuffle, 1000);
  }
}

function try_to_play() {
  // if ($("#player-bar-play-pause").css("pointer-events") !== "none") {
    $("#player-bar-play-pause").click();
    setTimeout(sendStatusIfChanged, 100)
  // }
  // $("#haha-custom-loading-div").remove();
}

function try_to_ff() {
  $("#player-bar-forward").click();
}

function try_to_rw() {
  $("#player-bar-rewind").click();
}

function is_playing() {
  return ($("#player-bar-play-pause[title^='Pause']").length > 0);
}

function try_to_pause() {
  if (is_playing()) {
    $("#player-bar-play-pause").click();
    setTimeout(sendStatusIfChanged, 100)
  }
}

function wait_for_load(callback, selector = LOAD_CHECKING_SELECTOR) {
  if ($(selector).get().length === 0) {
    // console.log('Waiting for $("' + selector + '")...');
    setTimeout(function(){wait_for_load(callback, selector)}, 100);
    return;
  } else {
    callback();
  }
}



function is_playing() {
  return $("#player-bar-play-pause[title^='Pause']").length > 0;
}

var NO_SONG = 0;
var PLAYING = 1;
var PAUSED  = 2;

var string_statuses = ["has no song", "playing", "paused"];

var status = -1;
var last_visible = undefined;
function sendStatusIfChanged(force_message = false) {
  var has_no_song = $("#currently-playing-title").length == 0;
  var playing = is_playing();
  // console.log("playing? " + playing);
  var new_status = "";
  if (has_no_song) {
    new_status = NO_SONG;
  } else {
    new_status = playing ? PLAYING : PAUSED;
  }
  if ((new_status != status) || (last_visible != visible) || force_message) {
    status = new_status
    last_visible = !!visible;
    var message = {"status": {"play_state" : string_statuses[status], "has_focus":!!last_visible}}
    port.postMessage(message);
    // console.log(JSON.stringify(message));
  }
}


function repeatedlySendStatus() {
  sendStatusIfChanged();
  // console.log("tick");
  setTimeout(repeatedlySendStatus, 100);
}

var port = chrome.runtime.connect({name: "audio"});
// iFrames WAIT FOREVER.
wait_for_load(function(){
  port.onMessage.addListener(function(msg) {
    console.log("Got message: " + JSON.stringify(msg));
    if (msg.play === true) {
      wait_for_load(try_to_play);
    } else if (msg.play === "launch") {
      wait_for_load(try_to_shuffle);
    } else if (msg.play === "fast_forward") {
      wait_for_load(try_to_ff);
    } else if (msg.play === "rewind") {
      wait_for_load(try_to_rw);
    } else {
      console.assert(msg.play === false);
      wait_for_load(try_to_pause);
    }
  });
  port.postMessage({ready:"true"});
  repeatedlySendStatus();
});

