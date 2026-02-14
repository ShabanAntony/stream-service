const sortButtons = document.querySelectorAll('.js-sort-btn');
const streamerRows = Array.from(document.querySelectorAll('.js-streamer-row'));
const streamersList = document.querySelector('.js-streamers-list');
const followButtons = document.querySelectorAll('.js-follow-btn');

sortButtons.forEach((button) => {
  button.addEventListener('click', () => {
    sortButtons.forEach((item) => item.classList.remove('is-active'));
    button.classList.add('is-active');

    if (!streamersList) {
      return;
    }

    const sortType = button.dataset.sort;
    const rows = [...streamerRows];

    rows.sort((a, b) => {
      const aViewers = Number(a.dataset.viewers || 0);
      const bViewers = Number(b.dataset.viewers || 0);

      if (sortType === 'lowest') {
        return aViewers - bViewers;
      }

      if (sortType === 'new') {
        return 0;
      }

      return bViewers - aViewers;
    });

    rows.forEach((row) => streamersList.appendChild(row));
  });
});

followButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.stopPropagation();

    const card = button.closest('.js-channel-card');
    if (!card) {
      return;
    }

    card.classList.toggle('is-followed');
    button.textContent = card.classList.contains('is-followed') ? 'v' : '+';
  });
});
