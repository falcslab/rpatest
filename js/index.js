$(document).ready(function () {
  //DB初期化
  initdb();
  bulkputdb();

  // $(".transitForm #title").val("");
  // $(".transitForm #body").val("");

  $("#isFir").change(function () {
    $("#hh, #mm").prop("disabled", true);
  });
  $("#isDep,#isArr,#isLas,#isAvr").change(function () {
    $("#hh, #mm").prop("disabled", false);
  });
  $("#btnSearch").on("click", function () {
    // ボタン連打対策
    $("#btnSearch").prop("disabled", true);
    getDbStationByStNm(
      $(".transitForm #sfrom").val(),
      $(".transitForm #sto").val()
    )
      .then(() => {
        window.location.href = "./result.html";
      })
      .catch((error) => {
        // 何もしない
      });
  });
});
