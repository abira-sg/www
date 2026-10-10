(function () {
  document.getElementById('yr').textContent = new Date().getFullYear();

  // Remove the profile photo if the file is missing so the initial shows instead.
  var photo = document.getElementById('avatar');
  if (photo) {
    photo.addEventListener('error', function () { photo.remove(); });
    if (photo.complete && photo.naturalWidth === 0) photo.remove();
  }

  // ---- reCAPTCHA (loaded only when the server has keys configured) ----
  var siteKey = null, widgetId = null;
  window.onRecaptchaLoad = function () {
    widgetId = grecaptcha.render('captcha', {
      sitekey: siteKey,
      theme: 'light' // site is always light pink now
    });
  };
  fetch('/api/config')
    .then(function (r) { return r.json(); })
    .then(function (c) {
      if (!c.recaptchaSiteKey) return;
      siteKey = c.recaptchaSiteKey;
      var s = document.createElement('script');
      s.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
      s.async = true;
      document.head.appendChild(s);
    })
    .catch(function () {});

  // ---- Contact form ----
  var form = document.getElementById('contact-form');
  var status = document.getElementById('status');
  var btn = document.getElementById('send');
  function show(msg, cls) { status.textContent = msg; status.className = 'status ' + cls; }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var token = '';
    if (siteKey) {
      if (widgetId === null) { show('The security check is still loading. Try again in a moment.', 'err'); return; }
      token = grecaptcha.getResponse(widgetId);
      if (!token) { show('Please tick "I\'m not a robot" first.', 'err'); return; }
    }
    btn.disabled = true;
    show('Sending...', '');
    try {
      var res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign(Object.fromEntries(new FormData(form)), { recaptchaToken: token }))
      });
      var data = await res.json().catch(function () { return {}; });
      if (res.ok && data.ok) { form.reset(); show('Message sent. I will reply soon.', 'ok'); }
      else show(data.error || 'Could not send your message. Please try again.', 'err');
    } catch (err) {
      show('Network error. Check your connection and try again.', 'err');
    } finally {
      btn.disabled = false;
      if (siteKey && widgetId !== null) grecaptcha.reset(widgetId);
    }
  });
})();
