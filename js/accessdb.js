const db = new Dexie("transitDB");

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
    if (errormsg != "") {
      // 出発地エラーの場合、頭に改行を入れる
      errormsg = errormsg + "<br/>"
    }
    errormsg = errormsg + "該当する到着地が見つかりませんでした。"
  }
  if (errormsg != "") {
    // ボタン連打対策
    returnError(errorbox, errormsg)
    throw new Error("到着地エラー")
  }

  for (const stFr of stFrArr) {
    for (const stTo of stToArr) {
      // 出発駅の路線上に到着駅が存在するかチェック
      // 【未対応】重複登録されるバグあり？
      const resLineBySt = await db.join
        .get({ "line_cd": stFr.line_cd, "station_cd1": stTo.station_cd })

      if (resLineBySt != null) {
        result.push({ "line_cd": stFr.line_cd, "station_name_fr": stFr.station_name, "station_name_to": stTo.station_name })
      }
    }
  }

  if (result.length != 0) {
    for (let rs of result) {
      const resLine = await db.line
        .get({ "line_cd": rs.line_cd })

      // 路線名を配列に追加
      rs.line_name = resLine.line_name

      // 検索画面の各入力項目をセット
      rs.search_date = $("select#y").val() + "年" + $("select#m").val() + "月" + $("select#d").val() + "日"
      rs.search_time = $("select#hh").val() + "時" + $("select#mm").val() + "分"
      // 語尾の「出発」はラジオボタンの選択による

      // 【未対応】ラジオボタンの選択によって末尾の文言変更

      // tmpテーブルに検索結果を保存
      await db.tmp.put(rs)
        .catch((error) => {
          console.log(error);
        });
    }
  } else {
    // 検索結果0件の場合
    errormsg = errormsg + "検索結果が0件でした。"
    returnError(errorbox, errormsg)

    throw new Error("検索結果0件")
  }
}

function returnError(errorbox, errormsg) {
  // ボタン連打対策
  $("#btnSearch").prop("disabled", false);
  $("div#errorinfo").append(errorbox.replace("{$errormsg}", errormsg))
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
  for (let tm of tmpArr) {
    $("span#searchDate").text(tm[0].search_date)
    $("span#searchTime").text(tm[0].search_time)
    $("span#route1disp").text(tm[0].station_name_fr + " → （" + tm[0].line_name + "） → " + tm[0].station_name_to);
  }

}