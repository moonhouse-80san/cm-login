// ==================== 통합 로그인 및 권한 관리 시스템 ====================

// 1. 사용자 권한 레벨 정의
const USER_ROLES = {
    GUEST: 'guest',        // 비로그인 (신청만 가능)
    SUB_ADMIN: 'sub_admin', // 부관리자 (수정 가능, 설정 불가)
    ADMIN: 'admin'          // 관리자 (모든 권한)
};

// 2. 현재 로그인 상태 전역 변수
let currentUser = {
    role: USER_ROLES.GUEST,
    username: '',
    id: ''
};

function initializeLoginSystem() {
    // Firebase 인증 상태 감시
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                // DB에서 사용자 권한 확인
                const snapshot = await firebaseDb.ref(`admins/${user.uid}`).once('value');
                const adminData = snapshot.val();

                if (adminData && adminData.role) {
                    // base.js에서 선언된 currentUser의 값 업데이트
                    currentUser.role = adminData.role;
                    currentUser.username = user.email.split('@')[0];
                    currentUser.id = user.uid;

                    console.log("🔓 인증 완료:", currentUser.role);
                    
                    // 인증 완료 후 데이터 로드 실행
                    if (typeof loadFromFirebase === 'function') loadFromFirebase();
                    if (typeof listenToFirebaseChanges === 'function') listenToFirebaseChanges();
                }
            } catch (error) {
                console.error("권한 로드 에러:", error);
            }
        } else {
            // 로그아웃 상태일 때 초기화
            currentUser.role = USER_ROLES.GUEST;
            currentUser.username = '';
            currentUser.id = '';
        }
        
        // UI 업데이트 호출 (각 페이지별 버튼 노출 여부 등)
        if (typeof updateUIByRole === 'function') updateUIByRole();
    });
}

function login() {
    const id = document.getElementById('loginUsername').value.trim();
    const pw = document.getElementById('loginPassword').value;

    if (!id || !pw) {
        alert("아이디와 비밀번호를 입력하세요.");
        return;
    }

    // 아이디를 이메일 형식으로 변환하여 로그인
    auth.signInWithEmailAndPassword(id + "@email.com", pw)
        .then(() => {
            closeLoginModal();
            alert("로그인 성공");
        })
        .catch(err => alert("로그인 실패: " + err.message));
}

function confirmLogout() {
    auth.signOut().then(() => {
        alert("로그아웃 되었습니다.");
        location.reload();
    });
}

function hasEditPermission() {
    return currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.SUB_ADMIN;
}

function handleSettingsClick() {
    if (currentUser.role === USER_ROLES.GUEST) {
        openLoginModal();
    } else {
        if (typeof openSettings === 'function') openSettings();
    }
}

// 모달 제어 함수
function openLoginModal() { document.getElementById('loginModal').classList.add('active'); }
function closeLoginModal() { document.getElementById('loginModal').classList.remove('active'); }

// --- 권한 확인용 헬퍼 함수 ---

function hasEditPermission() {
    // 관리자나 부관리자 둘 다 수정 가능
    return currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.SUB_ADMIN;
}

function hasSettingsPermission() {
    // 설정 메뉴는 오직 'admin'만 접근 가능
    return currentUser.role === USER_ROLES.ADMIN;
}

// 페이지 로드 시 초기화 실행
document.addEventListener('DOMContentLoaded', initializeLoginSystem);