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
    email: '',
    id: ''
};

// 아이디를 내부 이메일 형식으로 변환
function convertToInternalEmail(username) {
    // 이미 @ 포함되어 있으면 그대로 사용 (기존 이메일 계정 호환)
    if (username.includes('@')) {
        return username;
    }
    // 아이디만 입력한 경우 내부 도메인 추가
    return username + '@clubapp.internal';
}

// 내부 이메일을 아이디로 변환 (표시용)
function convertToUsername(email) {
    if (!email) return '';
    // @clubapp.internal 도메인 제거
    if (email.endsWith('@clubapp.internal')) {
        return email.replace('@clubapp.internal', '');
    }
    // 일반 이메일은 그대로 반환
    return email;
}

// 로그인 상태 초기화
function initializeLoginSystem() {
    // Firebase Auth 상태 변경 리스너
    if (firebaseAuth) {
        firebaseAuth.onAuthStateChanged((user) => {
            if (user) {
                // 로그인된 상태
                console.log('✅ 로그인 상태 감지:', user.email, 'UID:', user.uid);
                
                // Firebase Realtime Database에서 사용자 역할(role) 확인
                firebaseDb.ref('admins/' + user.uid).once('value')
                    .then((snapshot) => {
                        const adminData = snapshot.val();
                        
                        if (adminData && adminData.role) {
                            // 역할이 있는 경우
                            // 이메일을 아이디로 변환하여 표시
                            const displayUsername = convertToUsername(user.email);
                            
                            currentUser = {
                                role: adminData.role, // 'admin' 또는 'sub_admin'
                                username: displayUsername,  // 아이디로 표시
                                email: user.email,  // 실제 이메일 보관
                                id: user.uid
                            };
                            
                            console.log('✅ 사용자 역할:', currentUser.role);
                            console.log('✅ 표시 이름:', currentUser.username);
                            updateUIByRole();
                            
                            // 로그인 모달이 열려있으면 닫기
                            closeLoginModal();
                        } else {
                            // admins 테이블에 없는 사용자 (권한 없음)
                            console.warn('⚠️ 권한이 없는 사용자:', user.email);
                            showAlert('이 계정은 관리 권한이 없습니다.');
                            firebaseAuth.signOut();
                        }
                    })
                    .catch((error) => {
                        console.error('❌ 역할 확인 실패:', error);
                        showAlert('사용자 정보를 확인할 수 없습니다.');
                        firebaseAuth.signOut();
                    });
            } else {
                // 로그아웃 상태
                console.log('ℹ️ 비로그인 상태');
                currentUser = {
                    role: USER_ROLES.GUEST,
                    username: '',
                    email: '',
                    id: ''
                };
                updateUIByRole();
            }
        });
    }
}

// 로그인 함수
function login() {
    const usernameInput = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberLogin').checked;

    console.log('🔑 로그인 시도 - 입력된 아이디:', usernameInput);

    if (!usernameInput || !password) {
        showAlert('아이디와 비밀번호를 입력해주세요!');
        return;
    }

    // 아이디를 내부 이메일 형식으로 변환
    const email = convertToInternalEmail(usernameInput);
    console.log('📧 변환된 이메일:', email);
    console.log('📌 로그인 상태 유지:', rememberMe);

    // 로그인 상태 유지 설정
    const persistence = rememberMe 
        ? firebase.auth.Auth.Persistence.LOCAL    // 브라우저 닫아도 유지
        : firebase.auth.Auth.Persistence.SESSION; // 탭 닫으면 로그아웃
    
    console.log('🔒 Persistence 모드:', rememberMe ? 'LOCAL (영구 유지)' : 'SESSION (세션만 유지)');

    // Persistence 설정 후 로그인
    firebaseAuth.setPersistence(persistence)
        .then(() => {
            console.log('✅ Persistence 설정 완료');
            // Firebase Authentication으로 로그인
            return firebaseAuth.signInWithEmailAndPassword(email, password);
        })
        .then((userCredential) => {
            // 로그인 성공
            const user = userCredential.user;
            console.log('✅ Firebase Auth 로그인 성공');
            console.log('  - 이메일:', user.email);
            console.log('  - UID:', user.uid);
            
            // Firebase Realtime Database에서 역할 확인
            console.log('🔍 역할 확인 중... 경로: /admins/' + user.uid);
            return firebaseDb.ref('admins/' + user.uid).once('value');
        })
        .then((snapshot) => {
            const adminData = snapshot.val();
            console.log('📊 Database 응답:', adminData);
            
            if (adminData && adminData.role) {
                // 역할이 있는 경우
                const role = adminData.role;
                const roleText = role === 'admin' ? '관리자' : '부관리자';
                
                // 이메일을 아이디로 변환하여 표시
                const displayUsername = convertToUsername(firebaseAuth.currentUser.email);
                
                currentUser = {
                    role: role,
                    username: displayUsername,  // 아이디로 표시
                    email: firebaseAuth.currentUser.email,  // 실제 이메일 보관
                    id: firebaseAuth.currentUser.uid
                };
                
                console.log('✅ 역할 설정 완료:');
                console.log('  - role:', currentUser.role);
                console.log('  - username (표시용):', currentUser.username);
                console.log('  - email (실제):', currentUser.email);
                console.log('  - id:', currentUser.id);
                
                closeLoginModal();
                showAlert(`환영합니다, ${displayUsername}님! (${roleText})`);
                updateUIByRole();
            } else {
                // admins 테이블에 역할이 없는 경우
                console.error('❌ 역할 없음:', adminData);
                console.error('  - UID:', firebaseAuth.currentUser.uid);
                console.error('  - 확인 경로: /admins/' + firebaseAuth.currentUser.uid);
                showAlert('이 계정은 관리 권한이 없습니다.\n\nFirebase Console에서 다음 경로에 역할을 추가해주세요:\n/admins/' + firebaseAuth.currentUser.uid + '/role = "admin"');
                firebaseAuth.signOut();
            }
        })
        .catch((error) => {
            console.error('❌ 로그인 실패:', error);
            console.error('  - 에러 코드:', error.code);
            console.error('  - 에러 메시지:', error.message);
            
            // 에러 메시지 처리
            let errorMessage = '로그인에 실패했습니다.';
            
            if (error.code === 'auth/wrong-password') {
                errorMessage = '비밀번호가 올바르지 않습니다.';
            } else if (error.code === 'auth/user-not-found') {
                errorMessage = '등록되지 않은 아이디입니다.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = '올바른 아이디 형식이 아닙니다.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = '네트워크 연결을 확인해주세요.';
            }
            
            showAlert(errorMessage);
        });
}

// 로그아웃 함수
function logout() {
    showLogoutConfirmModal();
}

// 로그아웃 확인 모달 표시
function showLogoutConfirmModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <p>로그아웃 하시겠습니까?</p>
            <div class="modal-buttons">
                <button style="background: #f44336;" onclick="confirmLogout()">로그아웃</button>
                <button style="background: #9E9E9E;" onclick="closeLogoutModal()">취소</button>
            </div>
        </div>
    `;
    modal.id = 'logoutConfirmModal';
    document.body.appendChild(modal);
}

// 로그아웃 실행
function confirmLogout() {
    // Firebase Auth 로그아웃
    firebaseAuth.signOut()
        .then(() => {
            console.log('✅ 로그아웃 성공');
            currentUser = {
                role: USER_ROLES.GUEST,
                username: '',
                email: '',
                id: ''
            };
            closeLogoutModal();
            showAlert('로그아웃되었습니다.');
            updateUIByRole();
            clearForm();
        })
        .catch((error) => {
            console.error('❌ 로그아웃 실패:', error);
            showAlert('로그아웃에 실패했습니다.');
        });
}

// 로그아웃 모달 닫기
function closeLogoutModal() {
    const modal = document.getElementById('logoutConfirmModal');
    if (modal) {
        modal.remove();
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
    
    // 레슨 관리 섹션 표시/숨김 - 비로그인 사용자는 완전히 숨김
    const lessonManagementSection = document.getElementById('lessonManagementSection');
    if (lessonManagementSection) {
        // 관리자 또는 부관리자일 때만 표시, 비로그인은 완전히 숨김
        if (role === USER_ROLES.ADMIN || role === USER_ROLES.SUB_ADMIN) {
            lessonManagementSection.style.display = 'block';
        } else {
            lessonManagementSection.style.display = 'none';
            // 달력이 열려있다면 닫기
            const calendar = document.getElementById('formCalendar');
            if (calendar) {
                calendar.style.display = 'none';
            }
            const toggleText = document.getElementById('calendarToggleText');
            if (toggleText) {
                toggleText.textContent = '달력 열기';
            }
        }
    }
    
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

    // 현재 레슨 횟수 입력란
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
    
    // 로그인 상태 유지 체크박스 - 기본값은 체크된 상태로
    const rememberCheckbox = document.getElementById('rememberLogin');
    if (rememberCheckbox) {
        rememberCheckbox.checked = true; // 기본값: 체크됨 (로그인 상태 유지)
    }
    
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
    const result = currentUser.role !== USER_ROLES.GUEST;
    console.log('✅ hasEditPermission:', result, '현재 역할:', currentUser.role);
    return result;
}

function canEditMember(member) {
    if (!member) {
        return false;
    }

    if (currentUser.role === USER_ROLES.ADMIN) {
        return true;
    }

    if (currentUser.role === USER_ROLES.SUB_ADMIN) {
        const coachName = (currentUser.username || '').trim();
        const canEdit = coachName !== '' && member.coach === coachName;
        console.log('✅ canEditMember (sub_admin):', canEdit, 'coach:', member.coach, 'user:', coachName);
        return canEdit;
    }

    return false;
}

function canEditMemberByIndex(index) {
    return canEditMember(members[index]);
}

function hasSettingsPermission() {
    const result = currentUser.role === USER_ROLES.ADMIN;
    console.log('✅ hasSettingsPermission:', result, '현재 역할:', currentUser.role);
    return result;
}

function hasLessonManagementPermission() {
    // 관리자 또는 부관리자만 레슨 관리 가능
    const result = currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.SUB_ADMIN;
    console.log('✅ hasLessonManagementPermission:', result, '현재 역할:', currentUser.role);
    return result;
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
    if (!canEditMemberByIndex(index)) {
        showAlert('이 회원을 삭제할 권한이 없습니다.');
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