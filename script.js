/**************  STORAGE & UTIL  **************/
const KEYS = {
  siswa: 'dbSiswa',
  tugas: 'dbTugas',
  submissions: 'dbSubmissions',   // [{username,tugasIndex,filename,mime,dataUrl,timestamp}]
  nilaiTugas: 'dbNilaiTugas',     // [{username,tugasIndex,nilai}]
  uh1: 'dbUH1',                   // [{soal,opsi:[A..E],jawaban,skor,imgSoal,imgA..imgE}]
  uh2: 'dbUH2',
  jawaban: 'dbJawabanSiswa',      // { [username]: { UH1:{score,answers}, UH2:{...} } }
  foto: 'dbFoto'                  // { admin:dataUrl, [username]:dataUrl }
};
const LS = {
  get:(k,def)=>{ try{return JSON.parse(localStorage.getItem(k)) ?? def;}catch{ return def; } },
  set:(k,v)=> localStorage.setItem(k, JSON.stringify(v))
};
function fileToDataURL(file, maxMB=2){
  return new Promise((res,rej)=>{
    if(file.size > maxMB*1024*1024) return rej(new Error(`Ukuran file > ${maxMB}MB`));
    const fr=new FileReader();
    fr.onload=e=>res(e.target.result);
    fr.onerror=rej;
    fr.readAsDataURL(file);
  });
}
function downloadCSV(filename, rows){
  const csv = rows.map(r => r.map(v => `"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

/**************  PAGE DETECT  **************/
document.addEventListener('DOMContentLoaded', ()=>{
  const page = document.body.dataset.page;

  // seed jika null
  if(LS.get(KEYS.tugas) === null) LS.set(KEYS.tugas, []);
  if(LS.get(KEYS.siswa) === null) LS.set(KEYS.siswa, []);
  if(LS.get(KEYS.uh1)   === null) LS.set(KEYS.uh1,   []);
  if(LS.get(KEYS.uh2)   === null) LS.set(KEYS.uh2,   []);
  if(LS.get(KEYS.foto)  === null) LS.set(KEYS.foto,  {});

  if(page==='login') initLogin();
  if(page==='admin') initAdmin();
  if(page==='siswa') initSiswa();
});

/**************  LOGIN  **************/
function initLogin(){
  const el = document.getElementById('adminAvatarLogin');
  const foto = (LS.get(KEYS.foto, {})['admin']) || '';
  el.src = foto || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2272%22 height=%2272%22><rect width=%2272%22 height=%2272%22 fill=%22%23dbeafe%22/><text x=%2236%22 y=%2238%22 font-size=%2220%22 text-anchor=%22middle%22 fill=%22%23111%22>A</text></svg>';

  document.getElementById('btnLogin').onclick = ()=>{
    const u = document.getElementById('username').value.trim();
    const p = document.getElementById('password').value.trim();
    if(u==='admin' && p==='123'){ location.href = 'admin.html'; return; }
    const db = LS.get(KEYS.siswa, []);
    const s = db.find(x=> x.username===u && x.password===p);
    if(s){ sessionStorage.setItem('loginSiswa', JSON.stringify(s)); location.href = 'siswa.html'; }
    else alert('Login gagal. Periksa username/password.');
  };
}

/**************  ADMIN  **************/
function initAdmin(){
  // tombol keluar
  document.getElementById('btnKeluar').onclick = ()=>{ location.href='index.html'; };

  // foto admin
  const avatar = document.getElementById('adminAvatar');
  const map = LS.get(KEYS.foto, {});
  avatar.src = map['admin'] || '';
  document.getElementById('btnSimpanFotoAdmin').onclick = async ()=>{
    const f = document.getElementById('adminFotoInput').files?.[0];
    if(!f) return alert('Pilih foto terlebih dahulu.');
    try{
      const dataUrl = await fileToDataURL(f);
      const m = LS.get(KEYS.foto, {}); m['admin']=dataUrl; LS.set(KEYS.foto, m);
      document.getElementById('adminAvatar').src = dataUrl;
      alert('Foto admin disimpan.');
    }catch(e){ alert(e.message); }
  };

  // sidebar routing
  document.querySelectorAll('.sidebar button[data-go]').forEach(btn=>{
    btn.onclick = ()=> showAdminSection(btn.dataset.go);
  });

  // render default
  showAdminSection('dbSiswa');
}

function showAdminSection(id){
  document.querySelectorAll('main .section').forEach(s=> s.style.display='none');
  document.getElementById(id).style.display='block';
  if(id==='dbSiswa') renderDbSiswa();
  if(id==='penugasan') renderPenugasan();
  if(id==='penilaian') renderPenilaian();
  if(id==='uh1') renderUHAdmin(1);
  if(id==='uh2') renderUHAdmin(2);
  if(id==='nilai') renderTotalNilai();
}

/*** Database Siswa ***/
function renderDbSiswa(){
  const wrap = document.getElementById('dbSiswa');
  const db = LS.get(KEYS.siswa, []);
  wrap.innerHTML = `
    <h2>Database Siswa</h2>
    <div class="grid min2">
      <input id="namaSiswa" placeholder="Nama">
      <input id="userSiswa" placeholder="Username">
      <input id="kelasSiswa" placeholder="Kelas">
      <input id="passSiswa" placeholder="Password">
      <button class="secondary" id="btnTambahSiswa">Simpan</button>
    </div>
    <table class="table">
      <thead><tr><th>Nama</th><th>Username</th><th>Kelas</th><th>Password</th><th>Hapus</th></tr></thead>
      <tbody>${db.map((s,i)=>`
        <tr>
          <td>${s.nama}</td><td>${s.username}</td><td>${s.kelas}</td><td>${s.password}</td>
          <td><button class="danger" data-i="${i}" data-act="hapusSiswa">Hapus</button></td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  wrap.querySelector('#btnTambahSiswa').onclick = ()=>{
    const nama = document.getElementById('namaSiswa').value.trim();
    const user = document.getElementById('userSiswa').value.trim();
    const kelas= document.getElementById('kelasSiswa').value.trim();
    const pass = document.getElementById('passSiswa').value.trim();
    if(!nama||!user||!kelas||!pass) return alert('Lengkapi data.');
    const arr = LS.get(KEYS.siswa, []); arr.push({nama,username:user,kelas,password:pass}); LS.set(KEYS.siswa, arr);
    renderDbSiswa();
  };
  wrap.querySelectorAll('[data-act="hapusSiswa"]').forEach(btn=>{
    btn.onclick = ()=>{ const i=+btn.dataset.i; const arr=LS.get(KEYS.siswa,[]); arr.splice(i,1); LS.set(KEYS.siswa,arr); renderDbSiswa(); };
  });
}

/*** Penugasan (maks 10) ***/
function renderPenugasan(){
  const wrap = document.getElementById('penugasan');
  const db = LS.get(KEYS.tugas, []);
  wrap.innerHTML = `
    <h2>Penugasan (maks 10)</h2>
    <div class="row">
      <input id="namaTugas" placeholder="Nama Penugasan">
      <button id="btnTambahTugas">Tambah</button>
    </div>
    <table class="table">
      <thead><tr><th>#</th><th>Nama Tugas</th><th>Hapus</th></tr></thead>
      <tbody>${db.map((t,i)=>`
        <tr><td>${i+1}</td><td>${t}</td>
        <td><button class="danger" data-i="${i}" data-act="hapusTugas">Hapus</button></td></tr>`).join('')}
      </tbody>
    </table>`;
  wrap.querySelector('#btnTambahTugas').onclick = ()=>{
    const nama = document.getElementById('namaTugas').value.trim();
    if(!nama) return alert('Isi nama penugasan.');
    const arr = LS.get(KEYS.tugas, []);
    if(arr.length>=10) return alert('Maksimal 10 penugasan.');
    arr.push(nama); LS.set(KEYS.tugas, arr); renderPenugasan();
  };
  wrap.querySelectorAll('[data-act="hapusTugas"]').forEach(btn=>{
    btn.onclick=()=>{ const i=+btn.dataset.i; const arr=LS.get(KEYS.tugas,[]); arr.splice(i,1); LS.set(KEYS.tugas,arr); renderPenugasan(); };
  });
}

/*** Pengecekan & Penilaian Penugasan ***/
function renderPenilaian(){
  const wrap = document.getElementById('penilaian');
  const tugas = LS.get(KEYS.tugas, []);
  const submissions = LS.get(KEYS.submissions, []);
  const nilaiMap = LS.get(KEYS.nilaiTugas, []);
  const siswa = LS.get(KEYS.siswa, []);

  const select = `<select id="selectTugasPenilaian">${tugas.map((t,i)=>`<option value="${i}">${i+1}. ${t}</option>`).join('')}</select>`;
  wrap.innerHTML = `
    <h2>Pengecekan & Penilaian Penugasan</h2>
    <div class="row"><label>Pilih Tugas:</label>${select}</div>
    <div id="listPenilaian"></div>`;

  const renderList = ()=>{
    const idx = +document.getElementById('selectTugasPenilaian').value || 0;
    const subs = submissions.filter(s=> s.tugasIndex===idx);
    const html = `
      <table class="table">
        <thead><tr><th>Nama</th><th>Kelas</th><th>Berkas</th><th>Nilai</th><th>Simpan</th></tr></thead>
        <tbody>${subs.map(sub=>{
          const s = siswa.find(x=> x.username===sub.username);
          const nObj = nilaiMap.find(n=> n.username===sub.username && n.tugasIndex===idx);
          const nilai = nObj ? nObj.nilai : '';
          return `<tr>
            <td>${s?.nama||sub.username}</td>
            <td>${s?.kelas||'-'}</td>
            <td><a href="${sub.dataUrl}" target="_blank">${sub.filename}</a></td>
            <td><input type="number" min="0" max="100" value="${nilai}" data-user="${sub.username}" class="inpNilai"></td>
            <td><button class="secondary" data-user="${sub.username}" data-act="simpanNilai">Simpan</button></td>
          </tr>`;
        }).join('')}</tbody></table>`;
    document.getElementById('listPenilaian').innerHTML = html;

    document.querySelectorAll('[data-act="simpanNilai"]').forEach(btn=>{
      btn.onclick=()=>{
        const user = btn.dataset.user;
        const idx = +document.getElementById('selectTugasPenilaian').value || 0;
        const inp = document.querySelector(`.inpNilai[data-user="${user}"]`);
        const val = parseFloat(inp.value);
        if(isNaN(val)) return alert('Isi nilai.');
        const arr = LS.get(KEYS.nilaiTugas, []);
        const i = arr.findIndex(n=> n.username===user && n.tugasIndex===idx);
        if(i>=0) arr[i].nilai = val; else arr.push({username:user,tugasIndex:idx,nilai:val});
        LS.set(KEYS.nilaiTugas, arr);
        alert('Nilai disimpan.');
      };
    });
  };
  renderList();
  wrap.querySelector('#selectTugasPenilaian').onchange = renderList;
}

/*** Bank Soal UH (dengan gambar) ***/
function renderUHAdmin(no){
  const key = no===1?KEYS.uh1:KEYS.uh2;
  const db = LS.get(key, []);
  const wrap = document.getElementById(no===1?'uh1':'uh2');
  wrap.innerHTML = `
    <h2>Ulangan Harian ${no} (maks 50 soal)</h2>
    <div class="grid min2">
      <input id="q${no}_soal" placeholder="Teks Soal">
      <label>Gambar Soal <input type="file" id="q${no}_imgSoal" accept="image/*"></label>
      <input id="q${no}_a" placeholder="Pilihan A">
      <label>Gambar A <input type="file" id="q${no}_imgA" accept="image/*"></label>
      <input id="q${no}_b" placeholder="Pilihan B">
      <label>Gambar B <input type="file" id="q${no}_imgB" accept="image/*"></label>
      <input id="q${no}_c" placeholder="Pilihan C">
      <label>Gambar C <input type="file" id="q${no}_imgC" accept="image/*"></label>
      <input id="q${no}_d" placeholder="Pilihan D">
      <label>Gambar D <input type="file" id="q${no}_imgD" accept="image/*"></label>
      <input id="q${no}_e" placeholder="Pilihan E">
      <label>Gambar E <input type="file" id="q${no}_imgE" accept="image/*"></label>
      <input id="q${no}_jawaban" placeholder="Jawaban Benar (A-E)">
      <input id="q${no}_skor" type="number" placeholder="Skor">
      <button id="btnAddQ${no}">Tambahkan Soal</button>
    </div>

    <table class="table">
      <thead><tr><th>#</th><th>Soal</th><th>Jawaban</th><th>Skor</th><th>Hapus</th></tr></thead>
      <tbody>${db.map((q,i)=>`
        <tr>
          <td>${i+1}</td>
          <td>${q.soal || '(gambar saja)'} ${q.imgSoal? '<br><img class="imgthumb" src="'+q.imgSoal+'">' : ''}</td>
          <td>${q.jawaban}</td>
          <td>${q.skor}</td>
          <td><button class="danger" data-i="${i}" data-act="hapusQ${no}">Hapus</button></td>
        </tr>`).join('')}
      </tbody>
    </table>`;

  document.getElementById(`btnAddQ${no}`).onclick = async ()=>{
    const soal = document.getElementById(`q${no}_soal`).value.trim();
    const a = document.getElementById(`q${no}_a`).value.trim();
    const b = document.getElementById(`q${no}_b`).value.trim();
    const c = document.getElementById(`q${no}_c`).value.trim();
    const d = document.getElementById(`q${no}_d`).value.trim();
    const e = document.getElementById(`q${no}_e`).value.trim();
    const jaw= document.getElementById(`q${no}_jawaban`).value.trim().toUpperCase();
    const skor=parseFloat(document.getElementById(`q${no}_skor`).value);
    if(!'ABCDE'.includes(jaw) || isNaN(skor)) return alert('Isi jawaban (A-E) & skor.');

    // gambar opsional
    const fSoal = document.getElementById(`q${no}_imgSoal`).files?.[0];
    const fA = document.getElementById(`q${no}_imgA`).files?.[0];
    const fB = document.getElementById(`q${no}_imgB`).files?.[0];
    const fC = document.getElementById(`q${no}_imgC`).files?.[0];
    const fD = document.getElementById(`q${no}_imgD`).files?.[0];
    const fE = document.getElementById(`q${no}_imgE`).files?.[0];
    let imgSoal='', imgA='', imgB='', imgC='', imgD='', imgE='';
    try{
      if(fSoal) imgSoal = await fileToDataURL(fSoal, 2);
      if(fA) imgA = await fileToDataURL(fA, 2);
      if(fB) imgB = await fileToDataURL(fB, 2);
      if(fC) imgC = await fileToDataURL(fC, 2);
      if(fD) imgD = await fileToDataURL(fD, 2);
      if(fE) imgE = await fileToDataURL(fE, 2);
    }catch(e){ return alert(e.message); }

    const arr = LS.get(key, []);
    if(arr.length>=50) return alert('Maksimal 50 soal.');
    arr.push({soal, opsi:[a,b,c,d,e], jawaban:jaw, skor,
              imgSoal, imgA, imgB, imgC, imgD, imgE});
    LS.set(key, arr);
    renderUHAdmin(no);
  };

  wrap.querySelectorAll(`[data-act="hapusQ${no}"]`).forEach(btn=>{
    btn.onclick=()=>{ const i=+btn.dataset.i; const arr=LS.get(key,[]); arr.splice(i,1); LS.set(key,arr); renderUHAdmin(no); };
  });
}

/*** Total Nilai ***/
function hitungRataUser(username){
  const tugasNil = LS.get(KEYS.nilaiTugas, []).filter(n=> n.username===username).map(n=> n.nilai);
  const avgTugas = tugasNil.length? (tugasNil.reduce((a,b)=>a+b,0)/tugasNil.length) : 0;
  const J = LS.get(KEYS.jawaban, {});
  const uh1 = J[username]?.UH1?.score || 0;
  const uh2 = J[username]?.UH2?.score || 0;
  const rata = ((avgTugas + uh1 + uh2)/3).toFixed(2);
  return {avgTugas,uh1,uh2,rata};
}
function renderTotalNilai(){
  const wrap = document.getElementById('nilai');
  const siswa = LS.get(KEYS.siswa, []);
  wrap.innerHTML = `
    <h2>Total Nilai</h2>
    <table class="table">
      <thead><tr><th>Nama</th><th>Kelas</th><th>Tugas (rata)</th><th>UH1</th><th>UH2</th><th>Rata-rata</th></tr></thead>
      <tbody>
        ${siswa.map(s=>{
          const {avgTugas,uh1,uh2,rata} = hitungRataUser(s.username);
          return `<tr><td>${s.nama}</td><td>${s.kelas}</td><td>${avgTugas.toFixed(2)}</td><td>${uh1}</td><td>${uh2}</td><td>${rata}</td></tr>`;
        }).join('')}
      </tbody>
    </table>
    <button id="btnUnduhCSV">Unduh CSV</button>`;
  document.getElementById('btnUnduhCSV').onclick = ()=>{
    const rows = [["Nama","Kelas","Tugas(rata)","UH1","UH2","Rata-rata"]];
    siswa.forEach(s=>{
      const {avgTugas,uh1,uh2,rata} = hitungRataUser(s.username);
      rows.push([s.nama,s.kelas,avgTugas.toFixed(2),uh1,uh2,rata]);
    });
    downloadCSV('nilai_total.csv', rows);
  };
}

/**************  SISWA  **************/
function initSiswa(){
  const cur = JSON.parse(sessionStorage.getItem('loginSiswa')||'null');
  if(!cur){ location.href='index.html'; return; }

  // tombol keluar
  document.getElementById('btnKeluar').onclick = ()=>{ sessionStorage.removeItem('loginSiswa'); location.href='index.html'; };

  // profil
  const map = LS.get(KEYS.foto,{});
  document.getElementById('siswaAvatar').src = map[cur.username] || '';
  document.getElementById('siswaInfo').innerHTML =
    `<div><span class="badge">Nama</span> ${cur.nama}</div>
     <div><span class="badge">Username</span> ${cur.username}</div>
     <div><span class="badge">Kelas</span> ${cur.kelas}</div>`;
  document.getElementById('btnSimpanFotoSiswa').onclick = async ()=>{
    const f = document.getElementById('siswaFotoInput').files?.[0];
    if(!f) return alert('Pilih foto terlebih dahulu.');
    try{
      const dataUrl = await fileToDataURL(f);
      const m = LS.get(KEYS.foto, {}); m[cur.username]=dataUrl; LS.set(KEYS.foto,m);
      document.getElementById('siswaAvatar').src=dataUrl;
      alert('Foto siswa disimpan.');
    }catch(e){ alert(e.message); }
  };

  // sidebar routing
  document.querySelectorAll('.sidebar button[data-go]').forEach(btn=>{
    btn.onclick = ()=> showSiswaSection(btn.dataset.go);
  });

  // render default
  showSiswaSection('tugas');
}

function showSiswaSection(id){
  document.querySelectorAll('main .section').forEach(s=> s.style.display='none');
  document.getElementById(id).style.display='block';
  if(id==='tugas') renderTugasSiswa();
  if(id==='kerjaUH1') renderUHSiswa(1);
  if(id==='kerjaUH2') renderUHSiswa(2);
  if(id==='status') renderStatusSiswa();
}

/*** Kirim Penugasan ***/
function renderTugasSiswa(){
  const wrap = document.getElementById('tugas');
  const tugas = LS.get(KEYS.tugas, []);
  const cur = JSON.parse(sessionStorage.getItem('loginSiswa')||'null');
  const mySubs = LS.get(KEYS.submissions, []).filter(s=> s.username===cur.username);

  wrap.innerHTML = `
    <h2>Kirim Penugasan</h2>
    <div class="row">
      <label>Pilih Tugas:</label>
      <select id="selectTugasSiswa">${tugas.map((t,i)=>`<option value="${i}">${i+1}. ${t}</option>`).join('')}</select>
    </div>
    <div class="row">
      <input type="file" id="fileTugas" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.mp4" capture="environment" />
      <button id="btnKirimTugas">Kirim</button>
    </div>
    <h3>Riwayat Pengiriman</h3>
    <table class="table">
      <thead><tr><th>Tugas</th><th>File</th><th>Waktu</th></tr></thead>
      <tbody>${mySubs.map(s=>`
        <tr><td>${tugas[s.tugasIndex]||'-'}</td>
        <td><a href="${s.dataUrl}" target="_blank">${s.filename}</a></td>
        <td>${new Date(s.timestamp).toLocaleString()}</td></tr>`).join('')}
      </tbody>
    </table>`;

  document.getElementById('btnKirimTugas').onclick = async ()=>{
    const idx = +document.getElementById('selectTugasSiswa').value || 0;
    const f = document.getElementById('fileTugas').files?.[0];
    if(!f) return alert('Pilih file tugas.');
    try{
      const dataUrl = await fileToDataURL(f);
      const arr = LS.get(KEYS.submissions, []);
      const curUser = JSON.parse(sessionStorage.getItem('loginSiswa'));
      arr.push({username:curUser.username, tugasIndex:idx, filename:f.name, mime:f.type, dataUrl, timestamp:Date.now()});
      LS.set(KEYS.submissions, arr);
      alert('Tugas terkirim.');
      renderTugasSiswa();
    }catch(e){ alert(e.message); }
  };
}

/*** Kerjakan UH (menampilkan gambar jika ada) ***/
function renderUHSiswa(no){
  const key = no===1?KEYS.uh1:KEYS.uh2;
  const wrap = document.getElementById(no===1?'kerjaUH1':'kerjaUH2');
  const db = LS.get(key, []);
  const cur = JSON.parse(sessionStorage.getItem('loginSiswa')||'null');
  const J = LS.get(KEYS.jawaban,{});
  const prev = J[cur.username]?.[`UH${no}`]?.answers || {};

  if(!db.length){
    wrap.innerHTML = `<h2>Ulangan Harian ${no}</h2><p class="hint">Belum ada soal dari admin.</p>`;
    return;
  }

  wrap.innerHTML = `
    <h2>Ulangan Harian ${no}</h2>
    <div id="wrapQ${no}">
      ${db.map((q,i)=>`
        <div class="question">
          <div><b>${i+1}.</b> ${q.soal||''} ${q.imgSoal? `<br><img class="imgthumb" src="${q.imgSoal}">`:''}</div>
          <div class="opts">
            ${['A','B','C','D','E'].map((L,idx)=>{
              const checked = prev[`q${i}`]===L ? 'checked' : '';
              const img = {A:q.imgA,B:q.imgB,C:q.imgC,D:q.imgD,E:q.imgE}[L];
              const text = q.opsi[idx]||'';
              return `<label><input type="radio" name="q${no}_${i}" value="${L}" ${checked}> ${L}. ${text} ${img? `<br><img class="imgthumb" src="${img}">`:''}</label>`;
            }).join('')}
          </div>
        </div>`).join('')}
    </div>
    <button id="btnSimpanUH${no}">Simpan Jawaban</button>`;

  document.getElementById(`btnSimpanUH${no}`).onclick = ()=>{
    let score=0; const answers={};
    db.forEach((q,i)=>{
      const el = document.querySelector(`input[name=q${no}_${i}]:checked`);
      const val = el? el.value : '';
      answers[`q${i}`]=val;
      if(val===q.jawaban) score += Number(q.skor)||0;
    });
    const J2 = LS.get(KEYS.jawaban,{});
    if(!J2[cur.username]) J2[cur.username] = {};
    J2[cur.username][`UH${no}`] = {score,answers};
    LS.set(KEYS.jawaban, J2);
    alert(`Jawaban UH${no} tersimpan. Nilai: ${score}`);
  };
}

/*** Status Kelengkapan ***/
function renderStatusSiswa(){
  const wrap = document.getElementById('status');
  const cur = JSON.parse(sessionStorage.getItem('loginSiswa')||'null');
  const tugas = LS.get(KEYS.tugas, []);
  const subs = LS.get(KEYS.submissions, []).filter(s=> s.username===cur.username);
  const submittedIdx = new Set(subs.map(s=> s.tugasIndex));
  const belum = tugas.map((_,i)=>i).filter(i=> !submittedIdx.has(i));
  const J = LS.get(KEYS.jawaban,{});
  const uh1 = J[cur.username]?.UH1?.score;
  const uh2 = J[cur.username]?.UH2?.score;

  wrap.innerHTML = `
    <h2>Status Kelengkapan</h2>
    <p><b>Tugas belum dikirim:</b> ${belum.length? belum.map(i=> `${i+1}. ${tugas[i]}`).join(', ') : '<span class="badge">Semua terkirim</span>'}</p>
    <p><b>Status UH1:</b> ${uh1==null? 'Belum' : `<span class="badge">Selesai (${uh1})</span>`}</p>
    <p><b>Status UH2:</b> ${uh2==null? 'Belum' : `<span class="badge">Selesai (${uh2})</span>`}</p>`;
}

