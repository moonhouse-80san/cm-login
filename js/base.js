// Service Worker 등록
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => console.log('✅ Service Worker 등록 성공:', registration.scope))
            .catch(error => console.log('❌ Service Worker 등록 실패:', error));
    });
}

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyATdL1AG7HI1KmK66MCi5sYzhogfNj1hZw",
  authDomain: "cmlogin-9d49d.firebaseapp.com",
  databaseURL: "https://cmlogin-9d49d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "cmlogin-9d49d",
  storageBucket: "cmlogin-9d49d.firebasestorage.app",
  messagingSenderId: "27409632244",
  appId: "1:27409632244:web:ec4f12d66f909b03e407a1"
};

// 전역 변수
let members = [];
let filteredMembers = [];
let settings = { 
    clubName: '',
    feePresets: [40000, 70000, 100000, 200000, 300000],
    coaches: ['', '', '', ''],
    // 계좌번호 설정
    bankAccount: {
        bank: '',
        accountNumber: ''
    }
};
let firebaseDb = null;
let firebaseAuth = null;

// 요일 배열
const daysOfWeek = ['월', '화', '수', '목', '금', '토', '일'];
const dayNames = {
    '월': '월요일',
    '화': '화요일',
    '수': '수요일',
    '목': '목요일',
    '금': '금요일',
    '토': '토요일',
    '일': '일요일'
};

// Firebase 초기화
try {
    firebase.initializeApp(firebaseConfig);
    firebaseDb = firebase.database();
    firebaseAuth = firebase.auth();
    
    console.log('✅ Firebase 초기화 완료');
    
    loadFromFirebase();
    listenToFirebaseChanges();
} catch (error) {
    console.error('Firebase 초기화 실패:', error);
}

// Firebase 데이터 로드
function loadFromFirebase() {
    firebaseDb.ref('members').once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            members = Object.values(data).map(normalizeMember);
            filteredMembers = [...members];
            renderMembers();
            renderSchedule();
        }
    });

    firebaseDb.ref('settings').once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            settings.clubName = data.clubName || '';
            settings.feePresets = data.feePresets || settings.feePresets;
            settings.coaches = data.coaches || ['', '', '', ''];
            settings.bankAccount = data.bankAccount || settings.bankAccount;

            document.getElementById('clubNameDisplay').textContent = settings.clubName || '구장명을 설정하세요';
            updateFeePresetButtons();
            renderCoachButtons();
        }
    });
}

// Firebase 변경 감지
function listenToFirebaseChanges() {
    firebaseDb.ref('members').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            members = Object.values(data).map(normalizeMember);
            const currentSearch = document.getElementById('searchInput').value;
            if (currentSearch) {
                filteredMembers = members.filter(member => {
                    return member.name.toLowerCase().includes(currentSearch.toLowerCase()) ||
                           (member.phone && member.phone.includes(currentSearch));
                });
            } else {
                filteredMembers = [...members];
            }
            renderMembers();
            renderSchedule();
        }
    });
}

// Firebase에 저장
function saveToFirebase() {
    function cleanObject(obj) {
        if (obj === null || obj === undefined) return null;
        if (Array.isArray(obj)) {
            return obj.map(item => cleanObject(item)).filter(item => item !== undefined);
        }
        if (typeof obj === 'object') {
            const cleaned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const value = obj[key];
                    if (value === undefined || typeof value === 'function') continue;
                    if (value === null) {
                        cleaned[key] = null;
                        continue;
                    }
                    if (Array.isArray(value)) {
                        cleaned[key] = cleanObject(value);
                    } else if (typeof value === 'object') {
                        cleaned[key] = cleanObject(value);
                    } else {
                        cleaned[key] = value;
                    }
                }
            }
            return cleaned;
        }
        return obj;
    }

    try {
        const membersObj = {};
        members.forEach((member, index) => {
            membersObj[index] = cleanObject(member);
        });
        
        firebaseDb.ref('members').set(membersObj)
            .then(() => console.log('✅ Firebase 저장 성공'))
            .catch((error) => {
                console.error('❌ Firebase 저장 실패:', error);
                showAlert('데이터 저장에 실패했습니다: ' + error.message);
            });

        const cleanedSettings = cleanObject(settings);
        firebaseDb.ref('settings').set(cleanedSettings)
            .then(() => console.log('✅ 설정 저장 성공'))
            .catch((error) => console.error('❌ 설정 저장 실패:', error));
            
    } catch (error) {
        console.error('❌ saveToFirebase 오류:', error);
        showAlert('데이터 저장 중 오류가 발생했습니다: ' + error.message);
    }
}

// 회원 정규화 헬퍼
function normalizeMember(member) {
    const cleaned = {};
    for (const key in member) {
        if (member[key] !== undefined) {
            if (key === 'phone' && member[key] !== null) {
                cleaned[key] = String(member[key]);
            } else if (key === 'name' && member[key] !== null) {
                cleaned[key] = String(member[key]);
            } else if (key === 'coach' && member[key] !== null) {
                cleaned[key] = String(member[key]);
            } else if (key === 'schedules' && Array.isArray(member[key])) {
                cleaned[key] = member[key];
            } else {
                cleaned[key] = member[key];
            }
        }
    }
    
    if (!cleaned.photo) cleaned.photo = '';
    if (!cleaned.attendanceHistory) cleaned.attendanceHistory = [];
    if (!cleaned.coach) cleaned.coach = '';
    if (!cleaned.paymentHistory) cleaned.paymentHistory = [];
    if (!cleaned.phone) cleaned.phone = '';
    if (!cleaned.schedules) cleaned.schedules = [];
    
    return cleaned;
}

// 회비 프리셋 버튼 업데이트
function updateFeePresetButtons() {
    const feePresetsEl = document.getElementById('feePresets');
    feePresetsEl.innerHTML = '';

    settings.feePresets.forEach((fee, index) => {
        if (fee) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'fee-preset-btn';
            button.textContent = `${formatNumber(fee)}원`;
            button.onclick = () => {
                document.getElementById('fee').value = fee;
            };
            feePresetsEl.appendChild(button);
        }
    });
}

// 숫자 포맷팅
function formatNumber(num) {
    if (num === null || num === undefined || num === '') return '0';
    const number = typeof num === 'number' ? num : parseFloat(num);
    if (isNaN(number)) return '0';
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 날짜 포맷팅
function formatDate(dateString) {
    if (!dateString) return '';
    const [y, m, d] = dateString.split('-');
    return `${y}.${m}.${d}`;
}

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    const registerDateEl = document.getElementById('registerDate');
    const targetCountEl = document.getElementById('targetCount');
    const currentCountEl = document.getElementById('currentCount');
    
    if (registerDateEl) registerDateEl.valueAsDate = new Date();
    if (targetCountEl) targetCountEl.value = "0";
    if (currentCountEl) currentCountEl.value = "0";
    
    updateFeePresetButtons();
    renderCoachButtons();
    
    setTimeout(() => {
        if (members.length > 0) {
            renderMembers();
            renderSchedule();
        }
    }, 500);
});