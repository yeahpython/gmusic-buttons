
function try_to_play() {
	if ($("#player-bar-play-pause").css("pointer-events") === "none") {
	  $("#iflFab").click();
	} else {
	  $("#player-bar-play-pause").click();
	}
}
function wait_for_load(callback) {
	if ($("#iflFab").get().length === 0) {
		setTimeout(function(){wait_for_load(callback)}, 100);
		console.log("Waiting for load...");
		return;
	} else {
		callback();
	}
}
// try_to_play();
wait_for_load(try_to_play);