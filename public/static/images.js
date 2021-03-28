fetch("/uploads").then(res => {
    res.json().then(body => {
        console.log(body);
        const div = $("#images");
        for (const { username, date, path } of body) {
            div.append(`<div class="col"><div class="card">
              <div class="card-body">
                <h5 class="card-title">${username}</h5>
                <p class="card-text">${date}</p>
                <a href="/file/${path}" target="_blank">Link</a>
              </div>
            </div>
          </div>`)
        }
    });
});