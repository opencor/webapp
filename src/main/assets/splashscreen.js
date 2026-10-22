const searchParams = new URLSearchParams(window.location.search);

document.getElementById('copyright').textContent = searchParams.get('copyright') ?? '';
document.getElementById('version').textContent = searchParams.get('version') ?? '';
