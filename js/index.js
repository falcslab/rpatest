$(document).ready(function () {
  //DB初期化
  initdb()
  bulkputdb()

  $(".transitForm #title").val("");
  $(".transitForm #body").val("");

  //イベントハンドル
  $("#btnTest").on("click", function () {
    getData();
  });
  $("#btnSearch").on("click", function () {
    // ボタン連打対策
    $("#btnSearch").prop("disabled", true);
    getDbStationByStNm($(".transitForm #sfrom").val(), $(".transitForm #sto").val())
      .then(() => {
        window.location.href = './result.html';
      })
      .catch((error) => {
        // 何もしない
      })
  });
});
