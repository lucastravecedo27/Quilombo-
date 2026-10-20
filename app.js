const courts = [
  {
    id: 'verde',
    name: 'Arena Verde Padel',
    neighborhood: 'Pinheiros',
    location: 'pinheiros',
    price: 160,
    rating: '4.9',
    tag: 'MAIS RESERVADA',
    photo: '',
    facilities: ['Indoor', 'Estacionamento'],
    slots: ['08:00', '09:30', '11:00', '14:00', '16:30', '19:00'],
  },
  {
    id: 'central',
    name: 'Central Padel Club',
    neighborhood: 'Vila Mariana',
    location: 'vila-mariana',
    price: 140,
    rating: '4.8',
    tag: 'ÓTIMA LOCALIZAÇÃO',
    photo: 'photo-two',
    facilities: ['Coberta', 'Vestiário'],
    slots: ['07:30', '10:00', '12:30', '15:00', '18:00', '20:00'],
  },
  {
    id: 'tiebreak',
    name: 'Tie Break House',
    neighborhood: 'Itaim Bibi',
    location: 'itaim',
    price: 180,
    rating: '5.0',
    tag: 'PREMIUM',
    photo: 'photo-three',
    facilities: ['Panorâmica', 'Bar'],
    slots: ['08:30', '10:30', '13:00', '16:00', '18:30', '21:00'],
  },
];

const storageKey = 'setpadel-reservations';
const courtList = document.querySelector('#court-list');
const reservationList = document.querySelector('#reservation-list');
const dateInput = document.querySelector('#booking-date');
const locationFilter = document.querySelector('#location-filter');
const selections = new Map();
let toastTimer;

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && localDateString(date) === value;
}

function readReservations() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(value) ? value.filter((item) => (
      item && courts.some((court) => court.id === item.courtId)
      && isValidDate(item.date)
      && typeof item.id === 'string' && /^\d{10,16}-[a-z0-9]{6}$/.test(item.id)
      && typeof item.time === 'string'
      && courts.find((court) => court.id === item.courtId).slots.includes(item.time)
    )) : [];
  } catch {
    return [];
  }
}

function saveReservations(reservations) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(reservations));
  } catch {
    showToast('Não foi possível salvar. Verifique o armazenamento do navegador.');
    return false;
  }
  return true;
}

function formatDate(dateString, options) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString('pt-BR', options);
}

function renderCourts() {
  const date = dateInput.value;
  const location = locationFilter.value;
  const reservations = readReservations();
  const visibleCourts = courts.filter((court) => location === 'all' || court.location === location);

  courtList.innerHTML = visibleCourts.map((court) => {
    const selectedTime = selections.get(court.id);
    const slots = court.slots.map((time) => {
      const booked = reservations.some((reservation) => (
        reservation.courtId === court.id && reservation.date === date && reservation.time === time
      ));
      return `<button class="time-slot${selectedTime === time ? ' selected' : ''}" type="button"
        data-court="${court.id}" data-time="${time}" aria-pressed="${selectedTime === time}" ${booked ? 'disabled aria-label="' + time + ', reservado"' : ''}>${time}</button>`;
    }).join('');

    return `<article class="court-card">
      <div class="court-photo ${court.photo}" role="img" aria-label="Quadra de padel ${court.name}">
        <span class="court-tag">${court.tag}</span>
        <span class="court-rating">★ ${court.rating}</span>
      </div>
      <div class="court-info">
        <div class="court-title-row"><h3 class="court-title">${court.name}</h3><span class="court-price">R$ ${court.price}<small> / 1h30</small></span></div>
        <p class="court-location">⌖ &nbsp;${court.neighborhood}, São Paulo</p>
        <div class="court-facilities">${court.facilities.map((facility) => `<span class="facility">${facility}</span>`).join('')}</div>
        <p class="slot-label">HORÁRIOS DISPONÍVEIS</p>
        <div class="time-slots">${slots}</div>
        <button class="book-button" type="button" data-book="${court.id}" ${selectedTime ? '' : 'disabled'}>Reservar quadra</button>
      </div>
    </article>`;
  }).join('') || '<p class="empty-courts">Nenhuma quadra encontrada nessa região.</p>';
}

function renderReservations() {
  const reservations = readReservations().sort((a, b) => (
    `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)
  ));
  document.querySelector('#reservation-count').textContent = reservations.length;
  document.querySelector('#reservation-heading-count').textContent = reservations.length;

  reservationList.innerHTML = reservations.map((reservation) => {
    const court = courts.find((item) => item.id === reservation.courtId);
    const dateLabel = formatDate(reservation.date, { day: '2-digit' });
    const monthLabel = formatDate(reservation.date, { month: 'short' }).replace('.', '');
    return `<article class="reservation-card">
      <div class="reservation-date"><strong>${dateLabel}</strong><span>${monthLabel}</span></div>
      <div class="reservation-detail"><strong>${court.name}</strong><span>${formatDate(reservation.date, { weekday: 'short', day: '2-digit', month: 'long' })} · ${reservation.time} · ${court.neighborhood}</span></div>
      <span class="reservation-price">R$ ${court.price}</span>
      <button class="cancel-button" type="button" data-cancel="${reservation.id}" aria-label="Cancelar reserva de ${court.name} às ${reservation.time}">Cancelar</button>
    </article>`;
  }).join('') || '<div class="empty-reservations">Você ainda não tem jogos marcados. Escolha uma quadra e bora jogar!</div>';
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2800);
}

courtList.addEventListener('click', (event) => {
  const slotButton = event.target.closest('[data-time]');
  if (slotButton) {
    selections.set(slotButton.dataset.court, slotButton.dataset.time);
    renderCourts();
    return;
  }

  const bookButton = event.target.closest('[data-book]');
  if (!bookButton) return;

  const court = courts.find((item) => item.id === bookButton.dataset.book);
  const time = selections.get(court.id);
  const date = dateInput.value;
  if (!time || !isValidDate(date) || date < localDateString(new Date())) return;

  const reservations = readReservations();
  const alreadyBooked = reservations.some((reservation) => (
    reservation.courtId === court.id && reservation.date === date && reservation.time === time
  ));
  if (alreadyBooked) {
    selections.delete(court.id);
    renderCourts();
    showToast('Esse horário acabou de ser reservado. Escolha outro.');
    return;
  }

  reservations.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, courtId: court.id, date, time });
  if (!saveReservations(reservations)) return;
  selections.delete(court.id);
  renderCourts();
  renderReservations();
  showToast(`Quadra reservada para ${formatDate(date, { day: '2-digit', month: 'short' })} às ${time}!`);
});

reservationList.addEventListener('click', (event) => {
  const cancelButton = event.target.closest('[data-cancel]');
  if (!cancelButton) return;
  if (!saveReservations(readReservations().filter((reservation) => reservation.id !== cancelButton.dataset.cancel))) return;
  renderCourts();
  renderReservations();
  showToast('Reserva cancelada. O horário está disponível novamente.');
});

dateInput.addEventListener('change', () => {
  selections.clear();
  renderCourts();
});
locationFilter.addEventListener('change', () => {
  selections.clear();
  renderCourts();
});

const today = localDateString(new Date());
dateInput.min = today;
dateInput.value = today;
renderCourts();
renderReservations();
