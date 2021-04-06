$(document).ready(function () {
    initdb()
    getTmpData()
    $("#btnBack").on("click", function () {
        // 検索画面に遷移
        window.location.href = './index.html';
    });
});

