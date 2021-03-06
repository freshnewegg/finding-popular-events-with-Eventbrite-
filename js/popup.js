var EVENT_SEARCH_URL = 'https://www.eventbriteapi.com/v3/events/search/';
var TOKEN = '3ITFVULE4KTKINXCP3SL';
var DESCRIPTION_MAX_LEN = 300;

var cityInput = $('#city-input');
var stateInput = $('#state-input');
var searchError = $('#search-error');
var standbyMsg = $('#standby-msg');
var eventsContainer = $('#events-container');
var weeklyEvents = $('#weekly-events');

var eventSearch = function() {
  // clear previous results and error messages before performing a new search
  weeklyEvents.empty();
  searchError.empty();
  eventsContainer.hide();
  // clear cached results
  clearStoredEventListHTML();

  var city = cityInput.val();
  var state = stateInput.val();

  if (!city || !state) {
    searchError.text('Please enter a city and state.');
    return;
  }

  var options = {
    token: TOKEN,
    popular: true,
    'venue.city': city,
    'venue.region': state.toUpperCase(), // venue.region only accepts uppercase state codes
    'start_date.keyword': 'this_week'
  };

  standbyMsg.show();
  $.get(EVENT_SEARCH_URL, options, updateView);
};

/**
 * Populate the popup with the list of events specified in 'data'.
 */
var updateView = function(data) {
  standbyMsg.hide();
  var events = data.events;

  if (!events.length) {
    searchError.text('We couldn\'t find any popular events near your location :(');
    return;
  }

  // Buffer event details into 'eventListHTML' and append to the DOM once
  var eventListHTML = '';
  for (var i = 0, len = events.length; i < len; i++) {
    var name = events[i].name.text;
    var description = truncate(events[i].description.text);
    var startTime = formatTime(events[i].start.utc);
    var eventUrl = events[i].url;
    eventListHTML += '<div class="event-title"><a href="' + eventUrl + '" class="event-link">' + name + '</a></div>';
    eventListHTML += '<div>' + startTime + '</div>';
    eventListHTML += '<p>' + description + '</p>';
  }
  weeklyEvents.append(eventListHTML);
  eventsContainer.show();

  // cache results so they will still be available after popup close
  storeEventListHTML(eventListHTML);
  // Make event links clickable
  attachLinkEventHandler();
};

// Helpers

/**
 * Truncate 'str' to 'DESCRIPTION_MAX_LEN' characters.
 */
var truncate = function(str) {
  var trunced = str.substring(0, DESCRIPTION_MAX_LEN);
  if (trunced.length < str.length) {
    trunced += '...';
  }
  return trunced;
};

/**
 * Convert UTC to local time and date.
 * e.g. '2015-03-22T03:00:00Z' --> 'Saturday, 3/21, 8 PM PDT'
 */
var formatTime = function(utc) {
  var date = new Date(utc);
  return date.toLocaleTimeString('en-US', {
    weekday: 'long',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    timeZoneName: 'short'
  });
};

// Cache handlers

var storeLocation = function() {
  chrome.storage.sync.set({
    city: cityInput.val(),
    state: stateInput.val()
  });
};

var getStoredLocation = function(callback) {
  chrome.storage.sync.get(['city', 'state'], callback);
};

var storeEventListHTML = function(html) {
  chrome.storage.sync.set({ eventListHTML: html });
};

var getStoredEventListHTML = function(callback) {
  chrome.storage.sync.get('eventListHTML', callback);
};

var clearStoredEventListHTML = function() {
  chrome.storage.sync.remove('eventListHTML');
};

// Event handlers

/**
 * Executed each time the popup is opened.
 */
$(function() {
  // Populate the city/state input fields with previous inputs
  getStoredLocation(function(location) {
    if (location && location.city && location.state) {
      cityInput.val(location.city);
      stateInput.val(location.state);
    }
  });

  // Populate the popup with the results of the last query
  getStoredEventListHTML(function(data) {
    if (data.eventListHTML) {
      weeklyEvents.html(data.eventListHTML);
      eventsContainer.show();
      attachLinkEventHandler();
    }
  });
});

/**
 * Makes it so event links open in a new chrome tab when clicked.
 * Note: Should only be called after all 'event-link' <a> elements are added to the DOM.
 */
var attachLinkEventHandler = function() {
  $('.event-link').click(function(element) {
    chrome.tabs.create({ url: element.target.href });
  });
};

$('#search-button').click(function() {
  storeLocation(); // cache the inputted city/state pair
  eventSearch();
});
