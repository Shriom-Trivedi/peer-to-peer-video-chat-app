let form = document.getElementById('join-form');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  let inviteCode = e.target.invite_link.value;
  console.log(inviteCode)
  window.location = `index.html?room=${inviteCode}`;
});
