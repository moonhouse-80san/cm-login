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

/**
 * [초기화] 페이지 로드 시 실행되어 Firebase 인증 상태를 감시합니다.
 */
function initializeLoginSystem() {
    // Firebase 인증 상태 변화 감시자
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            // [로그인 성공] DB에서 해당 유저의 권한(role)을 가져옵니다.
            try {
                // Realtime Database의 'admins/유저UID' 경로 확인
                const snapshot = await firebase.database().ref(`admins/${user.uid}`).once('value');
                const adminData = snapshot.val();

                if (adminData && adminData.role) {
                    // DB에 권한 설정이 있는 경우 (admin 또는 sub_admin)
                    currentUser = {
                        role: adminData.role,
                        username: user.email.split('@')[0],
                        id: user.uid
                    };
                } else {
                    // 인증은 되었으나 DB에 권한 등록이 없는 경우 (손님 취급)
                    currentUser = {
                        role: USER_ROLES.GUEST,
                        username: user.email.split('@')[0],
                        id: user.uid
                    };
                }
            } catch (error) {
                console.error("권한 조회 중 오류 발생:", error);
                currentUser.role = USER_ROLES.GUEST;
            }
        } else {
            // [로그아웃 상태]
            currentUser = {
                role: USER_ROLES.GUEST,
                username: '',
                id: ''
            };
        }
        
        // 권한에 맞춰 UI(버튼 노출 등) 업데이트
        updateUIByRole();
    });
}

/**
 * [로그인 실행] Firebase Authentication 사용
 */
function login() {
    const email = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberLogin').checked;

    if (!email || !password) {
        showAlert('이메일과 비밀번호를 입력해주세요!');
        return;
    }

    // 로그인 유지 설정 (LOCAL: 브라우저 닫아도 유지, SESSION: 탭 닫으면 로그아웃)
    const persistence = rememberMe 
        ? firebase.auth.Auth.Persistence.LOCAL 
        : firebase.auth.Auth.Persistence.SESSION;

    firebase.auth().setPersistence(persistence)
        .then(() => {
            return firebase.auth().signInWithEmailAndPassword(email, password);
        })
        .then(() => {
            showAlert('반갑습니다!');
            closeLoginModal();
        })
        .catch((error) => {
            console.error("로그인 실패:", error.code);
            let message = "로그인에 실패했습니다.";
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                message = "이메일 또는 비밀번호가 일치하지 않습니다.";
            }
            showAlert(message);
        });
}

/**
 * [로그아웃 실행]
 */
function confirmLogout() {
    firebase.auth().signOut().then(() => {
        closeLogoutModal();
        showAlert('로그아웃되었습니다.');
        // onAuthStateChanged가 감지하여 UI를 자동으로 guest로 바꿉니다.
    }).catch((error) => {
        showAlert('로그아웃 중 오류가 발생했습니다.');
    });
}

// --- 모달 및 헬퍼 함수 (기존 로직 유지) ---

function logout() {
    showLogoutConfirmModal();
}

function showLogoutConfirmModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'logoutConfirmModal';
    modal.innerHTML = `
        <div class="modal-content">
            <p>로그아웃 하시겠습니까?</p>
            <div class="modal-buttons">
                <button style="background: #f44336;" onclick="confirmLogout()">로그아웃</button>
                <button style="background: #9E9E9E;" onclick="closeLogoutModal()">취소</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeLogoutModal() {
    const modal = document.getElementById('logoutConfirmModal');
    if (modal) modal.remove();
}

function openLoginModal() {
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginModal').classList.add('active');
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('active');
}

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