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
    // 로그인 유지가 체크되어 있으면 localStorage 사용, 아니면 sessionStorage 사용
    const rememberLogin = localStorage.getItem('rememberLogin') === 'true';
    const storage = rememberLogin ? localStorage : sessionStorage;
    
    const savedUser = storage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
    updateUIByRole();
}

// 로그인 함수
function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberLogin').checked;

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
        saveLoginState(rememberMe);
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
            saveLoginState(rememberMe);
            closeLoginModal();
            showAlert(`환영합니다, ${username}님! (부관리자)`);
            updateUIByRole();
            return;
        }
    }

    showAlert('아이디 또는 비밀번호가 잘못되었습니다!');
}

// 로그인 상태 저장 헬퍼 함수
function saveLoginState(rememberMe) {
    if (rememberMe) {
        localStorage.setItem('rememberLogin', 'true');
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        sessionStorage.removeItem('currentUser');
    } else {
        localStorage.removeItem('rememberLogin');
        localStorage.removeItem('currentUser');
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
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
        localStorage.removeItem('currentUser');
        localStorage.removeItem('rememberLogin');
        showAlert('로그아웃되었습니다.');
        updateUIByRole();
        clearForm();
    }
}

// 권한에 따른 UI 업데이트
function updateUIByRole() {
    const role = currentUser.role;
    const currentCountInput = document.getElementById('currentCount');
    const privateMemoSection = document.getElementById('privateMemoSection');
    const updateBtn = document.getElementById('updateBtn');
    const settingsUserStatus = document.getElementById('settingsUserStatus');
    const settingsLogoutBtn = document.getElementById('settingsLogoutBtn');
    const logoutIcon = document.getElementById('logoutIcon');
    const syncStatus = document.getElementById('syncStatus');
    
    // 동기화 버튼 표시/숨김 (로그인 시에만 표시)
    if (syncStatus) {
        syncStatus.style.display = role === USER_ROLES.GUEST ? 'none' : 'block';
    }
    
    // 헤더의 로그아웃 아이콘 표시/숨김
    if (logoutIcon) {
        logoutIcon.style.display = role === USER_ROLES.GUEST ? 'none' : 'flex';
    }
    
    // 설정 모달의 로그인 상태 표시
    if (settingsUserStatus) {
        if (role === USER_ROLES.GUEST) {
            settingsUserStatus.textContent = '👤 손님';
            settingsUserStatus.style.color = '#999';
        } else {
            const roleText = role === USER_ROLES.ADMIN ? '👑 관리자' : '🔰 부관리자';
            const roleColor = role === USER_ROLES.ADMIN ? '#FFD700' : '#4FC3F7';
            settingsUserStatus.innerHTML = `<span style="color: ${roleColor};">${roleText}</span> ${currentUser.username}`;
        }
    }
    
    // 설정 모달의 로그아웃 버튼
    if (settingsLogoutBtn) {
        settingsLogoutBtn.style.display = role === USER_ROLES.GUEST ? 'none' : 'block';
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

// 설정 아이콘 클릭 처리
function handleSettingsClick() {
    // 로그인되어 있지 않으면 로그인 모달 띄우기
    if (!hasEditPermission()) {
        openLoginModal();
    } else {
        // 로그인되어 있으면 기존 설정 열기
        openSettings();
    }
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