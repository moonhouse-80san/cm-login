// ==================== 로그인 시스템 ====================
// 사용자 권한 레벨
const USER_ROLES = {
    GUEST: 'guest',        // 비로그인 (읽기만 가능)
    SUB_ADMIN: 'sub_admin', // 부관리자 (수정/삭제 가능, 설정 불가)
    ADMIN: 'admin'          // 관리자 (모든 권한)
};

// 현재 로그인 상태
let currentUser = {
    role: USER_ROLES.GUEST,
    username: '',
    id: ''
};

// 로그인 상태 초기화
function initializeLoginSystem() {
    // 세션 스토리지에서 로그인 정보 복원
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
    updateUIByRole();
}

// 로그인 함수
function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        showAlert('아이디와 비밀번호를 입력해주세요!');
        return;
    }

    // 관리자 확인
    if (settings.adminUser && 
        username === settings.adminUser.username && 
        password === settings.adminUser.password) {
        currentUser = {
            role: USER_ROLES.ADMIN,
            username: username,
            id: 'admin'
        };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        closeLoginModal();
        showAlert(`환영합니다, ${username}님! (관리자)`);
        updateUIByRole();
        return;
    }

    // 부관리자 확인
    if (settings.subAdmins && settings.subAdmins.length > 0) {
        const subAdmin = settings.subAdmins.find(sa => 
            sa.username === username && sa.password === password
        );
        if (subAdmin) {
            currentUser = {
                role: USER_ROLES.SUB_ADMIN,
                username: username,
                id: subAdmin.id
            };
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            closeLoginModal();
            showAlert(`환영합니다, ${username}님! (부관리자)`);
            updateUIByRole();
            return;
        }
    }

    showAlert('아이디 또는 비밀번호가 잘못되었습니다!');
}

// 로그아웃 함수
function logout() {
    if (confirm('로그아웃 하시겠습니까?')) {
        currentUser = {
            role: USER_ROLES.GUEST,
            username: '',
            id: ''
        };
        sessionStorage.removeItem('currentUser');
        showAlert('로그아웃되었습니다.');
        updateUIByRole();
        clearForm();
    }
}

// 권한에 따른 UI 업데이트
function updateUIByRole() {
    const role = currentUser.role;
    const loginInfo = document.getElementById('loginInfo');
    const currentCountInput = document.getElementById('currentCount');
    const privateMemoSection = document.getElementById('privateMemoSection');
    const updateBtn = document.getElementById('updateBtn');
    const loginBtn = document.querySelector('.login-btn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // 로그인 상태 표시
    if (role === USER_ROLES.GUEST) {
        // 비로그인 상태
        if (loginInfo) {
            loginInfo.innerHTML = '<span style="color: white;">👤 손님</span>';
        }
        if (loginBtn) loginBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
    } else {
        // 로그인 상태
        const roleText = role === USER_ROLES.ADMIN ? '👑 관리자' : '🔰 부관리자';
        const roleColor = role === USER_ROLES.ADMIN ? '#FFD700' : '#4FC3F7';
        if (loginInfo) {
            loginInfo.innerHTML = `<span style="color: white; font-weight: 600;">${roleText} ${currentUser.username}</span>`;
        }
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
    }

    // 수정 버튼 상태
    if (updateBtn) {
        if (role === USER_ROLES.GUEST) {
            updateBtn.classList.add('btn-disabled');
            updateBtn.classList.remove('btn-update');
        } else {
            updateBtn.classList.remove('btn-disabled');
            updateBtn.classList.add('btn-update');
        }
    }

    // 현재 출석 횟수 입력란
    if (currentCountInput) {
        if (role === USER_ROLES.GUEST) {
            currentCountInput.setAttribute('readonly', true);
            currentCountInput.style.background = '#f0f0f0';
        } else {
            currentCountInput.removeAttribute('readonly');
            currentCountInput.style.background = '#ffffff';
        }
    }

    // 비밀글 섹션
    if (privateMemoSection) {
        privateMemoSection.style.display = (role !== USER_ROLES.GUEST) ? 'block' : 'none';
    }

    // 회원 목록 재렌더링
    renderMembers();
}

// 로그인 모달 열기
function openLoginModal() {
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginModal').classList.add('active');
}

// 로그인 모달 닫기
function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('active');
}

// 권한 확인 헬퍼 함수
function hasEditPermission() {
    return currentUser.role !== USER_ROLES.GUEST;
}

function hasSettingsPermission() {
    return currentUser.role === USER_ROLES.ADMIN;
}

// 수정 전 권한 확인
function checkPermissionBeforeUpdate() {
    if (!hasEditPermission()) {
        showAlert('수정 권한이 없습니다. 로그인해주세요!');
        openLoginModal();
        return false;
    }
    return updateMember();
}

// 삭제 전 권한 확인
function checkPermissionBeforeDelete(index) {
    if (!hasEditPermission()) {
        showAlert('삭제 권한이 없습니다. 로그인해주세요!');
        openLoginModal();
        return false;
    }
    showDeleteModal(index);
    return true;
}

// 설정 열기 전 권한 확인
function checkPermissionBeforeSettings() {
    if (!hasSettingsPermission()) {
        showAlert('설정 메뉴는 관리자만 접근 가능합니다!');
        return false;
    }
    return true;
}

// 페이지 로드 시 로그인 시스템 초기화
document.addEventListener('DOMContentLoaded', initializeLoginSystem);
