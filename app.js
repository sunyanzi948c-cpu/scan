// ⚠️ 這是您原本的 API 網址，已保留
const API_URL = "https://script.google.com/macros/s/AKfycbxpLmSQ9uhyr1JHpKTUVqbcg_kp-2ghMBEJlELd8ce5O2-yZfOatl1eRDgsQO5GtbnW/exec"; 

let html5QrCode;

// 網頁載入時，檢查上次同步時間並啟動掃描器
document.addEventListener("DOMContentLoaded", () => {
  const lastSync = localStorage.getItem("lastSyncTime");
  if (lastSync) {
    const syncTimeDiv = document.getElementById("sync-time");
    if (syncTimeDiv) syncTimeDiv.innerText = "最後同步時間：" + lastSync;
  }
  startScanner();
});

// ==========================================
// 1. 新增功能：下載整份表單並存入手機 (盤點前執行一次)
// ==========================================
function syncData() {
  const btn = document.querySelector('button[onclick="syncData()"]');
  if (btn) {
    btn.innerText = "🔄 資料下載中...";
    btn.disabled = true;
  }

  fetch(API_URL + "?action=sync")
    .then(response => response.json())
    .then(result => {
      if (result.status === "success") {
        // 將陣列轉為字串，存入瀏覽器空間 (LocalStorage)
        localStorage.setItem("deviceList", JSON.stringify(result.data));
        
        // 記錄當下時間
        const now = new Date().toLocaleString();
        localStorage.setItem("lastSyncTime", now);
        
        const syncTimeDiv = document.getElementById("sync-time");
        if (syncTimeDiv) syncTimeDiv.innerText = "最後同步時間：" + now;
        
        alert(`同步完成！共下載 ${result.data.length} 筆設備資料。\n現在您可以離線秒速掃碼了！`);
      } else {
        alert("同步失敗：" + result.message);
      }
    })
    .catch(err => {
      console.error(err);
      alert("網路連線錯誤，無法同步資料。");
    })
    .finally(() => {
      if (btn) {
        btn.innerText = "🔄 從雲端同步最新資料";
        btn.disabled = false;
      }
    });
}

// 初始化掃描器
function startScanner() {
  document.getElementById('result-container').style.display = 'none';
  document.getElementById('rescan-btn').style.display = 'none';
  
  // 【關鍵修正 1】：啟動前，若有舊實體則強制清理，避免畫面殘留白框
  if (html5QrCode) {
    try { html5QrCode.clear(); } catch (e) {}
  }
  
  html5QrCode = new Html5Qrcode("reader");
  const config = { fps: 10, qrbox: { width: 250, height: 150 } };
  
  html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
    .catch(err => {
      console.error("相機啟動失敗:", err);
      // 若相機硬體被鎖死，給予明確的操作提示
      alert("相機被佔用或啟動失敗！\n請將 APP 從背景「往上滑掉」完全關閉後，再重新開啟。");
    });
}

// 掃描成功時的處理
function onScanSuccess(decodedText, decodedResult) {
  if (html5QrCode) {
    // 【關鍵修正 2】：停止相機後，徹底清理 UI 並將實體銷毀
    html5QrCode.stop().then(() => {
      html5QrCode.clear();
      html5QrCode = null; 
      searchLocalData(decodedText);
    }).catch(err => {
      console.log("停止相機時發生錯誤", err);
      try { html5QrCode.clear(); } catch(e) {}
      html5QrCode = null;
      searchLocalData(decodedText);
    });
  } else {
    searchLocalData(decodedText);
  }
}

// 手動輸入條碼查詢
function manualSearch() {
  const inputField = document.getElementById('manual-barcode');
  const barcode = inputField.value.trim();
  
  if (!barcode) {
    alert("請輸入設備條碼！");
    return;
  }
  inputField.blur(); // 收起手機虛擬鍵盤

  // 【關鍵修正 3】：手動查詢時，也要正確釋放相機資源
  if (html5QrCode) {
    html5QrCode.stop().then(() => {
      html5QrCode.clear();
      html5QrCode = null;
      searchLocalData(barcode);
    }).catch(err => {
      try { html5QrCode.clear(); } catch(e) {}
      html5QrCode = null;
      searchLocalData(barcode);
    });
  } else {
    searchLocalData(barcode);
  }
}

// ==========================================
// 2. 新增功能：在 LocalStorage 中瞬間搜尋
// ==========================================
function searchLocalData(barcode) {
  const localDataStr = localStorage.getItem("deviceList");
  
  if (!localDataStr) {
    alert("手機內沒有資料，請先點擊上方的「從雲端同步最新資料」！");
    document.getElementById('rescan-btn').style.display = 'block';
    return;
  }

  const deviceList = JSON.parse(localDataStr);
  
  // 使用 JavaScript 內建方法在陣列中尋找符合的條碼 (瞬間完成)
  // 注意：這裡的 '設備條碼' 必須與您 Google 試算表 A1 儲存格的標題完全一致
  const foundDevice = deviceList.find(item => String(item['設備條碼']).trim() === String(barcode).trim());

  document.getElementById('rescan-btn').style.display = 'block';

  if (foundDevice) {
    renderData(foundDevice); // 找到資料，直接渲染畫面
  } else {
    alert(`資料庫中找不到該條碼 (${barcode}) 的設備資料\n(如果這是新設備，請先按同步按鈕更新資料)`);
  }
}

// 將資料渲染到畫面上
function renderData(data) {
  const container = document.getElementById('device-info');
  container.innerHTML = ''; 
  
  // 動態產生欄位資料
  for (const [key, value] of Object.entries(data)) {
    // 略過空白沒有填寫的欄位，讓畫面更乾淨
    if (!value || value === "") continue;

    const row = document.createElement('div');
    row.className = 'info-row';
    
    // 針對「圖檔1」與「圖檔2」欄位做圖片渲染處理
    if (key === '圖檔1' || key === '圖檔2') {
      let imageUrl = value;
      if (value.includes("drive.google.com/file/d/")) {
        const fileId = value.split("/d/")[1].split("/")[0];
        imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
      }

      row.innerHTML = `
        <div class="info-label" style="display: block; margin-bottom: 5px;">${key}：</div>
        <a href="${value}" target="_blank" title="點擊檢視原圖">
          <img src="${imageUrl}" 
               alt="${key}" 
               style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: block; margin: 0 auto; max-height: 200px; object-fit: cover;"
               onerror="this.onerror=null; this.parentNode.innerHTML='<a href=&quot;${value}&quot; target=&quot;_blank&quot; style=&quot;color: #3498db; text-decoration: underline;&quot;>🔗 點此開啟照片連結</a>';">
        </a>
      `;
    } 
    // 針對一般網址 (例如原廠手冊連結)
    else if (String(value).startsWith('http')) {
      row.innerHTML = `<span class="info-label">${key}：</span><a href="${value}" target="_blank" style="color: #3498db;">🔗 點此開啟</a>`;
    } 
    // 一般文字欄位 (包含日期格式化處理)
    else {
      let displayValue = value;
      
      // 【關鍵新增】：如果欄位名稱包含「日期」，且內容剛好是 8 位數字 (例如 20260505)
      if (key.includes('日期') && /^\d{8}$/.test(String(value).trim())) {
        const strVal = String(value).trim();
        const yyyy = strVal.substring(0, 4);
        const mm = strVal.substring(4, 6);
        const dd = strVal.substring(6, 8);
        displayValue = `${yyyy}/${mm}/${dd}`;
      }

      row.innerHTML = `<span class="info-label">${key}：</span><span>${displayValue}</span>`;
    }
    
    container.appendChild(row);
  }
  
  document.getElementById('result-container').style.display = 'block';
}

// ==========================================
// 4. 新增功能：手動輸入條碼查詢
// ==========================================
function manualSearch() {
  const inputField = document.getElementById('manual-barcode');
  const barcode = inputField.value.trim();
  
  if (!barcode) {
    alert("請輸入設備條碼！");
    return;
  }

  // 執行搜尋前，先收起手機的虛擬鍵盤 (優化手機端 UX)
  inputField.blur();

  // 嘗試停止相機掃描 (避免背景繼續耗電與衝突)，然後執行本地搜尋
  if (html5QrCode) {
    try {
      html5QrCode.stop().then(() => {
        searchLocalData(barcode);
      }).catch(err => {
        // 如果相機本來就處於停止狀態，會跳到 catch，此時直接搜尋即可
        searchLocalData(barcode);
      });
    } catch (e) {
      searchLocalData(barcode);
    }
  } else {
    searchLocalData(barcode);
  }
}

// 監聽手動輸入框的「Enter」鍵 (讓使用者用電腦鍵盤或手機鍵盤按下確認時也能搜尋)
document.addEventListener("DOMContentLoaded", () => {
  const manualInput = document.getElementById('manual-barcode');
  if (manualInput) {
    manualInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        manualSearch();
      }
    });
  }
});
