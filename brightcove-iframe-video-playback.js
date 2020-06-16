/**
 * @fileoverview Detects video playback events in the Brightcove player and
 * post a message for each of them.
 *
 * @author yuhui
 * @version 1.0.0
 *
 * @see https://player.support.brightcove.com/coding-topics/overview-player-api.html
 * Brightcove Player development overview
 * @see https://docs.brightcove.com/brightcove-player/current-release/Player.html
 * Brightcove Player API
 * @see https://html.spec.whatwg.org/#mediaevents
 * HTML5 media events
 *
 * @copyright 2020 Yuhui.
 *
 * @license GPL-3.0-or-later
 * Licensed under the GNU General Public License, Version 3.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.gnu.org/licenses/gpl-3.0.html
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @disclaimer This Software is provided "as-is" and any expressed or implied
 * warranties, including, but not limited to, the implied warranties of
 * merchantability and fitness for a particular purpose are disclaimed. In no
 * event shall the regents or contributors be liable for any direct, indirect,
 * incidental, special, exemplaray, or consequential damages (including, but
 * not limited to, procurement of substitute goods or services; loss of use,
 * data, or profits; or business interruption) however caused and on any theory
 * of liability, whether in contract, strict liability, or tort (including
 * negligence or otherwise) arising in any way out of the use of this software,
 * even if advised of the possibility of such damage.
 */

/**
 * @private
 * Given a playback event, get other metadata related to the event,
 * then send the event's details to the parent.
 * @param {Event} event The playback event.
 * @this {object} The Brightcove player object.
 */
function handlePlaybackEvent_(event) {
  var state = event.type;
  var player = this;

  var message = {
    currentTime: player.currentTime(),
    duration: player.duration(),
    name: player.mediainfo.name,
    state: state,
  };

  // IMPORTANT!
  // Replace '*' with the actual origin that should receive the message.
  // E.g. 'https://www.mysite.com:80'.
  var targetOrigin = '*';

  // Post the message to the target window.
  // The message is sent as a JSON string for compatibility.
  var targetWindow = window.frameElement ? window.frameElement : window.parent;
  targetWindow.postMessage(JSON.stringify(message), targetOrigin);

  // Handle the message in the target window appropriately.
}

/**
 * @public
 * Post messages to the window frame for specific media playback events.
 * @param {int} numTries Counter of tries to check that players are valid.
 * @throws any error from Brightcove's `videojs` object.
 */
function handleBrightcovePlayers(numTries) {
  var players = videojs.getPlayers();
  var playerIds = Object.keys(players);
  if (playerIds.length === 0) {
    // players are not ready, try again
    // give up after a total of about 7.5 seconds
    if (numTries < 10) {
      // use exponential backoff to delay
      setTimeout(function() {
        var numTries = numTries * 2;
        handleBrightcovePlayers(numTries);
      }, numTries * 500);
    }
  } else {
    // a Brightcove IFRAME can only include one player
    var playerId = playerIds[0];
    try {
      videojs.getPlayer(playerId).ready(function() {
        var player = this;
        var playerEvents = [
          'ended',
          'loadeddata',
          'pause',
          'play',
          'stalled',
          'timeupdate',
          'volumechange',
        ];
        playerEvents.forEach(function(playerEvent) {
          player.on(playerEvent, handlePlaybackEvent_);
        });
      });
    } catch (e) {
      // use a warning, not an error, so that other scripts can run normally
      console.warn(e);
    }
  }
}

handleBrightcovePlayers(1);