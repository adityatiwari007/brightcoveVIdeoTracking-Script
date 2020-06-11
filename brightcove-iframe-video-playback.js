/**
 * @fileoverview Detects video playback events in the Brightcove player and
 * sends a CustomEvent for each of them.
 *
 * Although the player is loaded in an IFRAME, Brightcover overwrites
 * `postMessage` with their own function, so you can't post messages between
 * the parent and frame windows.
 *
 * But the script is run in the context of the parent window. So CustomEvents
 * can be dispatched and they can be received in the main window.
 *
 * @author yuhui
 * @version 1
 *
 * @doc Brightcove Player development overview https://player.support.brightcove.com/coding-topics/overview-player-api.html
 * @doc Brightcove Player API https://docs.brightcove.com/brightcove-player/current-release/Player.html
 * @doc HTML5 media events https://html.spec.whatwg.org/#mediaevents
 */

/**
 * @private
 * Given a playback event, get other metadata related to the event,
 * then send the event's details to the parent.
 * @param {Event} event The playback event.
 * @this The Brightcove player object.
 */
function handlePlaybackEvent_(event) {
  var state = event.type;
  var player = this;

  var eventDetail = {
    currentTime: player.currentTime(),
    duration: player.duration(),
    name: player.mediainfo.name,
    state: state,
  };
  var eventInit = {
    detail: eventDetail,
  };

  if (window.frameElement) {
    // the player is in a Brightcove experience --> use CustomEvent
    var customEvent = new CustomEvent(state, eventInit);
    window.frameElement.dispatchEvent(customEvent);
  } else {
    // the player is embedded in the web page directly --> use postMessage
    var message = {
      state: state,
      eventInit: eventInit,
    };

    // IMPORTANT!
    // replace '*' with the actual origin that should receive the message
    // e.g. 'https://www.mysite.com:80'
    var targetOrigin = '*';

    // Brightcove only allows string messages to be posted,
    // so stringify the message object
    window.postMessage(JSON.stringify(message), targetOrigin);
    // handle the message in the parent window appropriately
  }
}

/**
 * @public
 * Send CustomEvents to the parent for specific media playback events.
 * @param {int} numTries Counter of tries to check that players are valid.
 */
function handleBrightcovePlayers(numTries) {
  var players = videojs.getPlayers();
  var playerIds = Object.keys(players);
  if (playerIds.length === 0) {
    // players are not ready, try again
    // give up after about 7.5 seconds
    if (numTries < 10) {
      // use exponential backoff to delay
      setTimeout(function() {
        var numTries = numTries * 2;
        handleBrightcovePlayers(numTries);
      }, numTries * 500);
    }
  } else {
    var playerId = playerIds[0];
    try {
      videojs.getPlayer(playerId).ready(function() {
        var player = this;
        var playerEvents = [
          'ended',
          'pause',
          'play',
        ];
        playerEvents.forEach(function(playerEvent) {
          player.on(playerEvent, handlePlaybackEvent_);
        });
      });
    } catch (e) {
      console.warn(e);
    }
  }
}

handleBrightcovePlayers(1);