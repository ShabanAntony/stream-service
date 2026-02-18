export function getDomRefs() {
  return {
    page: document.querySelector('.js-page'),
    dockButtons: document.querySelectorAll('.js-dock-btn'),
    focusToggle: document.querySelector('.js-focus-toggle'),
    searchInput: document.querySelector('.js-search-input'),
    listEl: document.querySelector('.js-stream-list'),
    resultsMetaEl: document.querySelector('.js-results-meta'),
    sortButtons: document.querySelectorAll('.js-sort-btn'),
    ageButtons: document.querySelectorAll('.js-age-btn'),
    languageSelect: document.querySelector('.js-language-select'),
    platformSelect: document.querySelector('.js-platform-select'),
    slotButtons: document.querySelectorAll('.js-slot-btn'),
    slotEls: document.querySelectorAll('.js-slot'),
  };
}
