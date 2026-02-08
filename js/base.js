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

// 2. Firebase 초기화
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// [추가] 3. 인증 서비스 연결
const auth = firebase.auth();
const database = firebase.database();

// [수정] 4. 전역 변수 설정
// 이제 currentUser는 로컬 스토리지에서 가져오는 게 아니라, 
// login.js의 initializeLoginSystem()에서 서버와 통신하며 채워질 것입니다.
let currentUser = {
    role: 'guest',
    username: '',
    id: ''
};

// 전역 변수
let members = [];
let filteredMembers = [];
let settings = { 
    clubName: '',
    feePresets: [40000, 70000, 100000, 200000, 300000],
    coaches: ['', '', '', ''],
    // 로그인 시스템
    adminUser: {
        username: 'admin',
        password: '0000'
    },
    subAdmins: [],
    // 계좌번호 설정
    bankAccount: {
        bank: '',
        accountNumber: ''
    }
};
let firebaseDb = null;

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

// 1. Firebase 초기화 (앱 실행 시 한 번만)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const firebaseDb = firebase.database();

/**
 * [수정된 초기화 함수] 
 * 인증이 완료된 후에만 데이터를 불러오도록 순서를 제어합니다.
 */
function initializeLoginSystem() {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            // [1단계] 로그인 유저의 권한 정보를 DB에서 가져옴
            try {
                const snapshot = await firebaseDb.ref(`admins/${user.uid}`).once('value');
                const adminData = snapshot.val();

                if (adminData && adminData.role) {
                    currentUser = {
                        role: adminData.role,
                        username: user.email.split('@')[0],
                        id: user.uid
                    };

                    // [2단계] 권한 확인이 끝난 후, 인증된 상태이므로 데이터를 불러옴
                    console.log("인증 성공: 데이터를 로드합니다.");
                    loadFromFirebase(); 
                    listenToFirebaseChanges();
                } else {
                    // 로그인 유저가 admins 목록에 없는 경우
                    currentUser = { role: 'guest', username: user.email.split('@')[0], id: user.uid };
                    showAlert('관리자 권한이 없습니다.');
                }
            } catch (error) {
                console.error("권한 확인 실패:", error);
            }
        } else {
            // [로그아웃 상태]
            currentUser = { role: 'guest', username: '', id: '' };
            // 로그아웃 시 데이터 초기화 (선택 사항)
            members = [];
            renderMembers();
        }
        
        // UI 업데이트 (버튼 노출 등)
        updateUIByRole();
    });
}

// 페이지 로드 시 감시자 시작
document.addEventListener('DOMContentLoaded', initializeLoginSystem);

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
            settings.adminUser = data.adminUser || settings.adminUser;
            settings.subAdmins = data.subAdmins || [];
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