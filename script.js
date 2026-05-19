document.addEventListener('DOMContentLoaded', () => {

  function updateClock() {
    const clockEl = document.getElementById('tray-clock');
    if (!clockEl) return;
    const now = new Date();
    let hours = now.getHours();
    const mins = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    clockEl.textContent = `${hours}:${mins} ${ampm}`;
  }
  updateClock();
  setInterval(updateClock, 1000);

  let highestZIndex = 1000;
  const isMobile = window.matchMedia('(max-width: 768px)');
  const canDragWindows = window.matchMedia('(min-width: 769px)');

  function resetMobileWindowPosition(win) {
    if (!isMobile.matches) return;
    win.classList.remove('is-positioned', 'is-dragging');
    win.style.left = '';
    win.style.top = '';
    win.style.transform = '';
  }

  window.openOsWindow = function (id) {
    const win = document.getElementById(id);
    if (!win) return;
    resetMobileWindowPosition(win);
    win.classList.remove('hidden');
    highestZIndex++;
    win.style.zIndex = highestZIndex;
    const tab = document.getElementById(`tab-${id}`);
    if (tab) {
      tab.classList.remove('d-none');
      updateActiveTabs(id);
    }
  };

  window.closeOsWindow = function (id) {
    const win = document.getElementById(id);
    if (win) win.classList.add('hidden');
    const tab = document.getElementById(`tab-${id}`);
    if (tab) tab.classList.add('d-none');
  };

  window.handleTaskbarClick = function (id) {
    const win = document.getElementById(id);
    if (!win) return;
    const isHidden = win.classList.contains('hidden');
    const isFront = String(win.style.zIndex) === String(highestZIndex) && !isHidden;

    if (isHidden) {
      window.openOsWindow(id);
    } else if (!isFront) {
      highestZIndex++;
      win.style.zIndex = highestZIndex;
      updateActiveTabs(id);
    } else {
      win.classList.add('hidden');
      const tab = document.getElementById(`tab-${id}`);
      if (tab) tab.classList.remove('active');
    }
  };

  function updateActiveTabs(activeId) {
    document.querySelectorAll('.taskbar-window-btn').forEach((tab) => {
      if (tab.id === `tab-${activeId}`) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }

  function focusWindow(win) {
    highestZIndex++;
    win.style.zIndex = highestZIndex;
    updateActiveTabs(win.id);
  }

  function pinWindowPosition(win) {
    const desktop = document.getElementById('desktop');
    if (!desktop) return;
    const desktopRect = desktop.getBoundingClientRect();
    const rect = win.getBoundingClientRect();
    win.classList.add('is-positioned');
    win.style.left = `${rect.left - desktopRect.left}px`;
    win.style.top = `${rect.top - desktopRect.top}px`;
    win.style.transform = 'none';
  }

  function clampWindowPosition(win, left, top) {
    const desktop = document.getElementById('desktop');
    if (!desktop) return { left, top };
    const minVisible = 48;
    const taskbarH = 30;
    const maxLeft = desktop.clientWidth - minVisible;
    const maxTop = desktop.clientHeight - taskbarH - minVisible;
    const minLeft = -(win.offsetWidth - minVisible);
    return {
      left: Math.min(maxLeft, Math.max(minLeft, left)),
      top: Math.min(maxTop, Math.max(0, top)),
    };
  }

  function enableWindowDrag(win) {
    const titleBar = win.querySelector('.title-bar');
    if (!titleBar) return;

    titleBar.addEventListener('mousedown', (e) => {
      if (!canDragWindows.matches) return;
      if (e.button !== 0) return;
      if (e.target.closest('.title-bar-controls')) return;

      e.preventDefault();
      focusWindow(win);
      pinWindowPosition(win);

      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = parseFloat(win.style.left) || 0;
      const startTop = parseFloat(win.style.top) || 0;

      win.classList.add('is-dragging');

      function onMove(ev) {
        const next = clampWindowPosition(
          win,
          startLeft + (ev.clientX - startX),
          startTop + (ev.clientY - startY)
        );
        win.style.left = `${next.left}px`;
        win.style.top = `${next.top}px`;
      }

      function onUp() {
        win.classList.remove('is-dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  document.querySelectorAll('.os-window-container').forEach((win) => {
    win.addEventListener('mousedown', () => focusWindow(win));
    enableWindowDrag(win);
  });

  const startBtn = document.getElementById('start-btn');
  const startMenu = document.getElementById('start-menu');

  startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = startMenu.hidden;
    startMenu.hidden = !isHidden;
    startBtn.setAttribute('aria-expanded', String(isHidden));
  });

  document.addEventListener('click', (e) => {
    if (!startMenu.hidden && !startMenu.contains(e.target) && e.target !== startBtn) {
      closeStartMenu();
    }
  });

  function closeStartMenu() {
    startMenu.hidden = true;
    startBtn.setAttribute('aria-expanded', 'false');
  }
  window.closeStartMenu = closeStartMenu;

  const filterBtns = document.querySelectorAll('.filter-btn[data-filter]');
  const projectItems = document.querySelectorAll('.project-item');
  const noResults = document.getElementById('no-results');
  const ieStatusText = document.getElementById('ie-status-text');

  function updateProjectStatus(count) {
    if (!ieStatusText) return;
    ieStatusText.textContent = count + (count === 1 ? ' item' : ' item(s)');
  }

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      if (!filter) return;
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      let visibleCount = 0;
      projectItems.forEach((item) => {
        const category = item.dataset.category;
        const matches = filter === 'all' || category === filter;
        if (matches) {
          item.classList.remove('hidden');
          visibleCount++;
        } else {
          item.classList.add('hidden');
        }
      });
      updateProjectStatus(visibleCount);
      if (visibleCount === 0) {
        noResults.classList.remove('d-none');
      } else {
        noResults.classList.add('d-none');
      }
    });
  });

  let modalOkCallback = null;
  const CV_FILENAME = 'KyleDungo_CV.pdf';

  const form = document.getElementById('contact-form');
  const nameInput = document.getElementById('contact-name');
  const emailInput = document.getElementById('contact-email');
  const messageInput = document.getElementById('contact-message');
  const errName = document.getElementById('err-name');
  const errEmail = document.getElementById('err-email');
  const errMessage = document.getElementById('err-message');

  let alertModal = null;
  function getAlertModal() {
    if (!alertModal) {
      alertModal = new bootstrap.Modal(document.getElementById('alertModal'));
    }
    return alertModal;
  }

  document.getElementById('modal-ok-btn').addEventListener('click', () => {
    if (modalOkCallback) {
      modalOkCallback();
      modalOkCallback = null;
    }
    getAlertModal().hide();
  });

  document.getElementById('modal-close-btn').addEventListener('click', () => {
    modalOkCallback = null;
    getAlertModal().hide();
  });

  // Lightbox Logistics for Photography Gallery
  let lightboxModal = null;
  function getLightboxModal() {
    if (!lightboxModal) {
      lightboxModal = new bootstrap.Modal(document.getElementById('lightboxModal'));
    }
    return lightboxModal;
  }

  window.openLightbox = function (src) {
    document.getElementById('lightbox-img').src = src;
    getLightboxModal().show();
  };

  window.closeLightbox = function () {
    getLightboxModal().hide();
  };

  window.downloadCv = function () {
    const modalTitleBar = document.getElementById('modal-title-bar');
    const modalIcon = document.getElementById('modal-icon');
    const modalMessage = document.getElementById('modal-message');
    const modalLabel = document.getElementById('alertModalLabel');

    modalTitleBar.style.background = '';
    modalIcon.src = 'img/icons/PDF.png';
    modalIcon.alt = 'PDF Document';
    modalLabel.textContent = 'File Download';
    modalMessage.innerHTML = 'Download <strong>' + CV_FILENAME + '</strong> to your computer?';

    modalOkCallback = function () {
      const link = document.createElement('a');
      link.href = CV_FILENAME;
      link.download = CV_FILENAME;
      document.body.appendChild(link);
      link.click();
      link.remove();
    };
    getAlertModal().show();
  };

  function setError(inputEl, errorEl, message) {
    errorEl.textContent = message;
    if (message) {
      inputEl.classList.add('invalid');
    } else {
      inputEl.classList.remove('invalid');
    }
  }

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let isValid = true;
    const nameVal = nameInput.value.trim();
    if (!nameVal) {
      setError(nameInput, errName, 'Identification validation parameters missing.');
      isValid = false;
    } else {
      setError(nameInput, errName, '');
    }
    const emailVal = emailInput.value.trim();
    if (!emailVal) {
      setError(emailInput, errEmail, 'Routing email signature missing.');
      isValid = false;
    } else if (!EMAIL_REGEX.test(emailVal)) {
      setError(emailInput, errEmail, 'Invalid addressing signature schema formatting.');
      isValid = false;
    } else {
      setError(emailInput, errEmail, '');
    }
    const messageVal = messageInput.value.trim();
    if (!messageVal) {
      setError(messageInput, errMessage, 'Content buffer parameters cannot compile empty.');
      isValid = false;
    } else {
      setError(messageInput, errMessage, '');
    }
    if (isValid) {
      modalOkCallback = null;

      // Transmit data to Formspree
      fetch("https://formspree.io/f/mdajakey", {
        method: "POST",
        body: new FormData(form),
        headers: {
          'Accept': 'application/json'
        }
      }).then(response => {
        if (response.ok) {
          showAlertModal('success', nameVal);
          form.reset();
          [nameInput, emailInput, messageInput].forEach((el) => el.classList.remove('invalid'));
        } else {
          showAlertModal('error', null);
        }
      }).catch(error => {
        showAlertModal('error', null);
      });

    } else {
      modalOkCallback = null;
      showAlertModal('error', null);
    }
  });

  function showAlertModal(type, name) {
    modalOkCallback = null;
    const modalTitleBar = document.getElementById('modal-title-bar');
    const modalIcon = document.getElementById('modal-icon');
    const modalMessage = document.getElementById('modal-message');
    const modalLabel = document.getElementById('alertModalLabel');

    if (type === 'success') {
      modalTitleBar.style.background = '';
      modalIcon.src = 'img/icons/Alert.png';
      modalIcon.alt = 'Success';
      modalLabel.textContent = 'Transaction Transmitted';
      modalMessage.innerHTML =
        '<strong>Data frame dispatched successfully!</strong><br/>Thank you, ' +
        escapeHtml(name) +
        '. Operation pipeline routing complete.';
    } else {
      modalTitleBar.style.background =
        'linear-gradient(to right, #9e0000 0%, #cc0000 40%, #9e0000 100%)';
      modalIcon.src = 'img/icons/Critical.png';
      modalIcon.alt = 'Validation Failure';
      modalLabel.textContent = 'Execution Interrupted';
      modalMessage.innerHTML =
        '<strong>Invalid syntax parameters flag.</strong><br/>Verify input validation protocols are filled out accurately to continue.';
    }
    getAlertModal().show();
  }

  function escapeHtml(str) {
    const el = document.createElement('div');
    el.appendChild(document.createTextNode(str));
    return el.innerHTML;
  }
});