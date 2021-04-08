const db = new Dexie("transitRPATest");
// 基本運賃
const basefare = 200
const addfare = 10
const addBaseMinutes = 2
const routeTag = '<li class="routerow"><dl><dt><div class="routetitle">ルート{$routeNo}</div>' +
  '</dt><dd><ul><li class="time"><span>{$departure}→</span><span>{$arrive}</span></li>' +
  '<li class="reqtime"><span>{$reqTime}</span></li>' +
  '<li class="fare"><span>{$fare}円</span></li><li class="transfer"><span>乗換：0回</span>' +
  '</li></ul><ul class="route"><li><span id="route{$routeNo}disp"></span></li></ul></dd></dl></li>'

function initdb() {
  db.version(1).stores({
    station:
      "station_cd,station_g_cd,station_name,line_cd,pref_cd,post,address,lon,lat",
    line:
      "line_cd,company_cd,line_name,line_name_k,line_name_h,line_color_c,line_color_t,line_type,lon,lat,zoom",
    join:
      "[line_cd+station_cd2], station_cd1, station_cd2",
    pref:
      "pref_cd, pref_name",
    tmp:
      "++id, line_cd, line_name, station_name_fr, station_name_to"
  });
}

function bulkputdb() {
  db.station.bulkPut(m_station).catch((error) => {
    console.log(error);
  });

  db.line.bulkPut(m_line).catch((error) => {
    console.log(error);
  });

  db.join.bulkPut(m_join).catch((error) => {
    console.log(error);
  });

  db.pref.bulkPut(m_pref).catch((error) => {
    console.log(error);
  });
}

async function getDbStationByStNm(stFrNm, stToNm) {
  let stFrArr = [];
  let stToArr = [];
  let result = [];

  let errorbox = '<div id="searchError" class="boxError" ><span>{$errormsg}</span></div>'
  let errormsg = ""

  // tmpテーブルをtruncate
  await db.tmp.clear()

  // エラーメッセージを消す
  $("div#searchError").remove()

  // 入力チェック
  if (stFrNm == "") {
    errormsg = makeErrorMsg(errormsg, "出発地を入力してください。")
  }
  if (stToNm == "") {
    errormsg = makeErrorMsg(errormsg, "到着地を入力してください。")
  }
  if (errormsg != "") {
    returnError(errorbox, errormsg)
    throw new Error("入力エラー")
  }

  // stFrNm（出発駅名）に紐つく駅一覧を取得
  await db.station
    .where("station_name")
    .equals(stFrNm.trim())
    .each((station) => {
      const tmpStArr = {
        station_cd: station.station_cd,
        line_cd: station.line_cd,
        station_name: station.station_name,
      };
      stFrArr.push(tmpStArr);
    })

  if (stFrArr.length == 0) {
    errormsg = errormsg + "該当する出発地が見つかりませんでした。"
  }

  // stToNm（到着駅名）に紐つく駅一覧を取得
  await db.station
    .where("station_name")
    .equals(stToNm.trim())
    .each((station) => {

      const tmpToArr = {
        station_cd: station.station_cd,
        line_cd: station.line_cd,
        station_name: station.station_name,
      };
      stToArr.push(tmpToArr);
    })

  if (stToArr.length == 0) {
    errormsg = makeErrorMsg(errormsg, "該当する到着地が見つかりませんでした。")
  }
  if (errormsg != "") {
    returnError(errorbox, errormsg)
    throw new Error("到着地エラー")
  }

  for (const stFr of stFrArr) {
    for (const stTo of stToArr) {
      // 出発駅の路線上に到着駅が存在するかチェック
      const resLineBySt = await db.join
        .get({ "line_cd": stFr.line_cd, "station_cd1": stTo.station_cd })

      if (resLineBySt == null) {
        continue;
      }

      // 路線名を検索
      const resLine = await db.line
        .get({ "line_cd": stFr.line_cd })
      if (resLine == null) {
        continue;
      }

      // 路線名を配列に追加
      const lineNm = resLine.line_name

      // 運賃,所要時間,到着駅までの駅数を配列に追加
      const [fare, reqTime] = calc(stFr.station_cd, stTo.station_cd)

      // 到着時間計算
      let dt = new Date($("select#y").val(), $("select#m").val(), $("select#d").val(),
        $("select#hh").val(), $("select#mm").val());
      dt.setMinutes(dt.getMinutes() + reqTime);

      // 検索画面の各入力項目をセット
      const searchDate = $("select#y").val() + "年" + $("select#m").val() + "月" + $("select#d").val() + "日"
      const searchTime = $("select#hh").val() + "時" + $("select#mm").val() + "分"
      const depTime = $("select#hh").val() + ":" + $("select#mm").val()
      const arvTime = ('00' + dt.getHours()).slice(-2) + ":" + ('00' + dt.getMinutes()).slice(-2)

      // 【未対応】ラジオボタンの選択によって末尾の文言変更

      result.push(stFr.station_cd)

      // tmpテーブルに検索結果を保存
      await db.tmp.put({
        "line_cd": stFr.line_cd, "line_name": lineNm,
        "station_name_fr": stFr.station_name, "station_name_to": stTo.station_name,
        "search_date": searchDate, "search_time": searchTime,
        "departure": depTime, "arrive": arvTime, "req_time": reqTime, "fare": fare
      })
        .catch((error) => {
          console.log(error);
        });
    }
  }

  // 路線名を配列に追加
  if (result.length == 0) {
    // 検索結果0件の場合
    errormsg = makeErrorMsg(errormsg, "検索結果が0件でした。")
    returnError(errorbox, errormsg)
    throw new Error("検索結果0件")
  }
}

// 運賃計算
function calc(station_cd_fr, station_cd_to) {
  const stcdfr = Number(station_cd_fr)
  const tocdfr = Number(station_cd_to)

  const stcnt = Math.abs(stcdfr - tocdfr)
  const fare = basefare + (stcnt * addfare)
  const reqTime = stcnt * addBaseMinutes

  return [fare, reqTime]
}

function returnError(errorbox, errormsg) {
  // ボタン連打対策
  $("#btnSearch").prop("disabled", false);
  $("div#errorinfo").append(errorbox.replace("{$errormsg}", errormsg))
}

function makeErrorMsg(errstr, errormsg) {
  if (errstr != "") {
    // 頭に改行を入れる
    errstr = errstr + "<br/>"
  }
  errstr = errstr + errormsg

  return errstr
}

// tmpテーブルから全件取得
async function getTmpData() {
  let tmpArr = [];

  // awaitを入れないとforループが先に走ってしまい画面に結果が表示されない
  await db.tmp.toArray()
    .then((tmp) => {
      tmpArr.push(tmp)
    })

  // 画面表示用にパラメータ変換
  let i = 0
  for (let tm of tmpArr[0]) {
    // パラメータ置換
    let tmpTag = routeTag
    tmpTag = tmpTag.replaceAll("{$routeNo}", i + 1)
    tmpTag = tmpTag.replace("{$stTime}", tm.search_time)
    tmpTag = tmpTag.replace("{$departure}", tm.departure)
    tmpTag = tmpTag.replace("{$arrive}", tm.arrive)
    tmpTag = tmpTag.replace("{$reqTime}", tm.req_time + "分")
    tmpTag = tmpTag.replace("{$fare}", tm.fare)

    $("ul#rtList").append(tmpTag)

    $("span#searchDate").text(tm.search_date)
    $("span#searchTime").text(tm.search_time)
    $("span#route" + (i + 1) + "disp").text(tm.station_name_fr + " → （" + tm.line_name + "） → " + tm.station_name_to);
    i++;
  }

}