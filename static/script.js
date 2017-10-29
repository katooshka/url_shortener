function getShortLink() {
    event.preventDefault();
    console.log(document.getElementById('long-link'));
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/shorten?link=' + document.getElementById('long-link').value, true);
    xhr.send();
    xhr.onreadystatechange = function() { 
      if (xhr.readyState != 4) return;
      if (xhr.status != 200) {
        alert(xhr.status + ': ' + xhr.statusText);
      } else {
        alert(xhr.responseText);
      }
    }
}
