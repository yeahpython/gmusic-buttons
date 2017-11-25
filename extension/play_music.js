var SHUFFLE_SELECTOR = "[data-id='shuffle-my-library']"

function try_to_play() {
	if ($("#player-bar-play-pause").css("pointer-events") === "none") {
	  // Wait a bit so that the play button for the most recent song has time to load
	  setTimeout(function(){$(SHUFFLE_SELECTOR).click();}, 1000);
	} else {
	  $("#player-bar-play-pause").click();
	}
	// $("#haha-custom-loading-div").remove();
}
function wait_for_load(callback) {
	if ($(SHUFFLE_SELECTOR).get().length === 0) {
		setTimeout(function(){wait_for_load(callback)}, 100);
		console.log("Waiting for load...");
		return;
	} else {
		callback();
	}
}

// wait_for_load(try_to_play);



var port = chrome.runtime.connect({name: "audio"});
port.onMessage.addListener(function(msg) {
  wait_for_load(try_to_play);
});
// port.postMessage({message: "This is the audio tab speaking."});