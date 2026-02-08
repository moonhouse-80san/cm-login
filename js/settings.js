function openSettings() {
    console.log('🔧 openSettings 호출됨');
    console.log('현재 사용자:', currentUser);
    console.log('hasSettingsPermission():', hasSettingsPermission());
    
    // 관리자만 접근 가능
    if (!hasSettingsPermission()) {
        console.warn('⚠️ 설정 접근 거부 - 관리자 권한 없음');
        showAlert('설정 메뉴는 관리자만 접근 가능합니다!');
        return;
    }
    
    console.log('✅ 설정 접근 허용 - openSettingsDialog 호출');
    openSettingsDialog();
}

function openSettingsDialog() {
    console.log('🔧 설정 모달 열기 - 현재 사용자:', currentUser);
    
    document.getElementById('clubNameInput').value = settings.clubName || '';
    document.getElementById('feePreset1').value = settings.feePresets[0] || '';
    document.getElementById('feePreset2').value = settings.feePresets[1] || '';
    document.getElementById('feePreset3').value = settings.feePresets[2] || '';
    document.getElementById('feePreset4').value = settings.feePresets[3] || '';
    document.getElementById('feePreset5').value = settings.feePresets[4] || '';

    document.getElementById('coachName1').value = settings.coaches[0] || '';
    document.getElementById('coachName2').value = settings.coaches[1] || '';
    document.getElementById('coachName3').value = settings.coaches[2] || '';
    document.getElementById('coachName4').value = settings.coaches[3] || '';
    
    // 계좌번호 설정
    if (settings.bankAccount) {
        document.getElementById('bankName').value = settings.bankAccount.bank || '';
        document.getElementById('accountNumber').value = settings.bankAccount.accountNumber || '';
    }

    // 관리자/부관리자 목록 로드 및 표시
    loadAdminsList();

    document.getElementById('settingsModal').classList.add('active');
    console.log('✅ 설정 모달 표시 완료');
}

// 관리자/부관리자 목록 로드
function loadAdminsList() {
    firebaseDb.ref('admins').once('value', (snapshot) => {
        const adminsData = snapshot.val();
        renderAdminsList(adminsData);
    });
}

// 관리자/부관리자 목록 렌더링
function renderAdminsList(adminsData) {
    const adminListContainer = document.getElementById('adminAccountsList');
    if (!adminListContainer) {
        console.error('❌ adminAccountsList 요소를 찾을 수 없습니다');
        return;
    }
    
    adminListContainer.innerHTML = '';
    
    if (!adminsData) {
        adminListContainer.innerHTML = '<div style="padding: 10px; text-align: center; color: #999;">등록된 관리자가 없습니다</div>';
        return;
    }
    
    const admins = [];
    const subAdmins = [];
    
    // 역할별로 분류
    Object.keys(adminsData).forEach(uid => {
        const admin = adminsData[uid];
        const item = {
            uid: uid,
            email: admin.email || 'Unknown',
            role: admin.role || 'unknown'
        };
        
        if (admin.role === 'admin') {
            admins.push(item);
        } else if (admin.role === 'sub_admin') {
            subAdmins.push(item);
        }
    });
    
    // 관리자 섹션
    if (admins.length > 0) {
        adminListContainer.innerHTML += '<div style="margin-bottom: 10px;">' +
            '<h4 style="color: #FF9800; margin-bottom: 5px;">👑 관리자</h4>';
        
        admins.forEach(admin => {
            const isCurrentUser = admin.uid === currentUser.id;
            const deleteBtn = isCurrentUser 
                ? '<span style="color: #999; font-size: 12px;">(현재 로그인)</span>'
                : '<button onclick="removeAdmin(\'' + admin.uid + '\')" style="padding: 6px 12px; background: #f44336; color: white; border: none; border-radius: 6px; cursor: pointer;">삭제</button>';
            
            adminListContainer.innerHTML += '<div style="display: flex; gap: 10px; margin-bottom: 10px; padding: 10px; background: #fff3e0; border-radius: 8px; align-items: center;">' +
                '<div style="flex: 1;">' +
                    '<div style="font-weight: 600; color: #FF9800;">' + admin.email + '</div>' +
                    '<div style="font-size: 12px; color: #666;">UID: ' + admin.uid.substring(0, 8) + '...</div>' +
                '</div>' +
                deleteBtn +
            '</div>';
        });
        
        adminListContainer.innerHTML += '</div>';
    }
    
    // 부관리자 섹션
    if (subAdmins.length > 0) {
        adminListContainer.innerHTML += '<div style="margin-bottom: 10px;">' +
            '<h4 style="color: #2196F3; margin-bottom: 5px;">🔰 부관리자</h4>';
        
        subAdmins.forEach(admin => {
            adminListContainer.innerHTML += '<div style="display: flex; gap: 10px; margin-bottom: 10px; padding: 10px; background: #e3f2fd; border-radius: 8px; align-items: center;">' +
                '<div style="flex: 1;">' +
                    '<div style="font-weight: 600; color: #2196F3;">' + admin.email.substring(0, 16) + '...</div>' +
                    '<div style="font-size: 12px; color: #666;">UID: ' + admin.uid.substring(0, 8) + '...</div>' +
                '</div>' +
                '<button onclick="removeAdmin(\'' + admin.uid + '\')" style="padding: 6px 12px; background: #f44336; color: white; border: none; border-radius: 6px; cursor: pointer;">삭제</button>' +
            '</div>';
        });
        
        adminListContainer.innerHTML += '</div>';
    }
    
    if (admins.length === 0 && subAdmins.length === 0) {
        adminListContainer.innerHTML = '<div style="padding: 10px; text-align: center; color: #999;">등록된 관리자가 없습니다</div>';
    }
}

// 새 관리자 추가 모달 열기
function openAddAdminModal() {
    const modal = document.createElement('div');
    modal.id = 'addAdminModal';
    modal.className = 'modal active';
    modal.style.zIndex = '10005';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>➕ 새 관리자 계정 생성</h2>
                <button class="close-btn" onclick="closeAddAdminModal()">×</button>
            </div>
            <div style="padding: 20px 0;">
                <div class="form-group">
                    <label for="newAdminEmail">이메일</label>
                    <input type="email" id="newAdminEmail" placeholder="admin@example.com" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                </div>
                <div class="form-group" style="margin-top: 15px;">
                    <label for="newAdminPassword">비밀번호</label>
                    <input type="password" id="newAdminPassword" placeholder="6자 이상 입력" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                    <div style="font-size: 12px; color: #666; margin-top: 5px;">※ 최소 6자 이상이어야 합니다</div>
                </div>
                <div class="form-group" style="margin-top: 15px;">
                    <label>역할</label>
                    <div style="display: flex; gap: 10px; margin-top: 8px;">
                        <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                            <input type="radio" name="newAdminRole" value="admin" checked>
                            <span>👑 관리자</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                            <input type="radio" name="newAdminRole" value="sub_admin">
                            <span>🔰 부관리자</span>
                        </label>
                    </div>
                    <div style="font-size: 12px; color: #666; margin-top: 8px;">
                        • 관리자: 모든 권한 (설정 변경 가능)<br>
                        • 부관리자: 회원 관리 및 레슨 체크 가능
                    </div>
                </div>
            </div>
            <div class="modal-buttons">
                <button style="background: #2196F3;" onclick="createNewAdmin()">계정 생성</button>
                <button style="background: #9E9E9E;" onclick="closeAddAdminModal()">취소</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeAddAdminModal() {
    const modal = document.getElementById('addAdminModal');
    if (modal) {
        modal.remove();
    }
}

// 새 관리자 계정 생성
function createNewAdmin() {
    const email = document.getElementById('newAdminEmail').value.trim();
    const password = document.getElementById('newAdminPassword').value;
    const role = document.querySelector('input[name="newAdminRole"]:checked').value;
    
    if (!email || !password) {
        showAlert('이메일과 비밀번호를 입력해주세요!');
        return;
    }
    
    if (password.length < 6) {
        showAlert('비밀번호는 최소 6자 이상이어야 합니다!');
        return;
    }
    
    console.log('🔧 새 관리자 계정 생성 시작:', email, role);
    
    // Firebase Authentication에 새 계정 생성
    firebaseAuth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log('✅ Firebase Auth 계정 생성 성공:', user.uid);
            
            // Realtime Database에 역할 저장
            return firebaseDb.ref('admins/' + user.uid).set({
                email: email,
                role: role,
                createdAt: new Date().toISOString()
            });
        })
        .then(() => {
            console.log('✅ 역할 저장 완료');
            
            // 생성된 계정으로 자동 로그인되므로 다시 원래 계정으로 로그인
            return firebaseAuth.signInWithEmailAndPassword(currentUser.username, 'temp');
        })
        .catch((signInError) => {
            // 원래 계정으로 재로그인 실패는 무시 (이미 로그인 상태일 수 있음)
            console.log('ℹ️ 재로그인 시도:', signInError.message);
        })
        .finally(() => {
            closeAddAdminModal();
            loadAdminsList();
            const roleText = role === 'admin' ? '관리자' : '부관리자';
            showAlert('새 ' + roleText + ' 계정이 생성되었습니다!\n\n이메일: ' + email + '\n\n해당 계정으로 로그인할 수 있습니다.');
        })
        .catch((error) => {
            console.error('❌ 계정 생성 실패:', error);
            
            let errorMessage = '계정 생성에 실패했습니다.';
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = '이미 사용 중인 이메일입니다.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = '올바른 이메일 형식이 아닙니다.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = '비밀번호가 너무 약합니다. 최소 6자 이상 입력해주세요.';
            }
            
            showAlert(errorMessage);
        });
}

// 관리자 삭제
function removeAdmin(uid) {
    // 현재 로그인한 사용자는 삭제 불가
    if (uid === currentUser.id) {
        showAlert('현재 로그인한 계정은 삭제할 수 없습니다!');
        return;
    }
    
    // 확인 모달
    showConfirm(
        '이 관리자 계정의 권한을 제거하시겠습니까?\n\n※ Firebase Authentication 계정은 삭제되지 않으며,\n관리자 권한만 제거됩니다.',
        function() {
            firebaseDb.ref('admins/' + uid).remove()
                .then(() => {
                    console.log('✅ 관리자 삭제 완료:', uid);
                    loadAdminsList();
                    showAlert('관리자 권한이 제거되었습니다.');
                })
                .catch((error) => {
                    console.error('❌ 관리자 삭제 실패:', error);
                    showAlert('삭제에 실패했습니다: ' + error.message);
                });
        }
    );
}

function closeSettings() {
    document.getElementById('settingsModal').classList.remove('active');
}

function saveSettings() {
    settings.clubName = document.getElementById('clubNameInput').value.trim();

    settings.coaches = [
        document.getElementById('coachName1').value.trim(),
        document.getElementById('coachName2').value.trim(),
        document.getElementById('coachName3').value.trim(),
        document.getElementById('coachName4').value.trim()
    ];

    settings.feePresets = [
        parseInt(document.getElementById('feePreset1').value) || 0,
        parseInt(document.getElementById('feePreset2').value) || 0,
        parseInt(document.getElementById('feePreset3').value) || 0,
        parseInt(document.getElementById('feePreset4').value) || 0,
        parseInt(document.getElementById('feePreset5').value) || 0
    ];
    
    // 계좌번호 설정 저장
    settings.bankAccount = {
        bank: document.getElementById('bankName').value.trim() || '',
        accountNumber: document.getElementById('accountNumber').value.trim() || ''
    };

    saveToFirebase();
    if (settings.clubName) {
        document.getElementById('clubNameDisplay').textContent = settings.clubName;
    }
    updateFeePresetButtons();
    renderCoachButtons();
    closeSettings();
    showAlert('설정이 저장되었습니다!');
}

// 데이터 엑셀 내보내기
function exportData() {
    if (members.length === 0) {
        showAlert('내보낼 회원 데이터가 없습니다!');
        return;
    }
    
    try {
        const membersData = members.map(member => {
            const scheduleData = [];
            
            if (member.schedules && member.schedules.length > 0) {
                for (let i = 0; i < 7; i++) {
                    if (i < member.schedules.length) {
                        const schedule = member.schedules[i];
                        scheduleData.push(
                            schedule.day || '',
                            schedule.startTime || '',
                            schedule.endTime || ''
                        );
                    } else {
                        scheduleData.push('', '', '');
                    }
                }
            } else {
                for (let i = 0; i < 21; i++) {
                    scheduleData.push('');
                }
            }
            
            return [
                member.name || '',
                member.phone || '',
                member.email || '',
                member.address || '',
                member.registerDate || '',
                member.fee || '',
                member.coach || '',
                member.targetCount || 0,
                member.currentCount || 0,
                ...scheduleData,
                member.gender || '',
                member.birthYear || '',
                member.skillLevel !== undefined && member.skillLevel !== null ? 
                    (member.skillLevel === -1 ? '희망' : 
                     member.skillLevel === 0 ? '0부' : 
                     `${member.skillLevel}부`) : '',
                member.awards ? member.awards.join('; ') : '',
                member.etc || ''
            ];
        });
        
        const headers = [
            '이름', '전화번호', '이메일', '주소', '등록일(YYYY-MM-DD)', 
            '월회비', '담당코치', '스케줄목표횟수', '현재스케줄횟수',
            '스케줄1_요일', '스케줄1_시작시간', '스케줄1_종료시간',
            '스케줄2_요일', '스케줄2_시작시간', '스케줄2_종료시간',
            '스케줄3_요일', '스케줄3_시작시간', '스케줄3_종료시간',
            '스케줄4_요일', '스케줄4_시작시간', '스케줄4_종료시간',
            '스케줄5_요일', '스케줄5_시작시간', '스케줄5_종료시간',
            '스케줄6_요일', '스케줄6_시작시간', '스케줄6_종료시간',
            '스케줄7_요일', '스케줄7_시작시간', '스케줄7_종료시간',
            '성별', '생년', '부수', '수상경력', '기타'
        ];
        
        const wsData = [headers, ...membersData];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        const wscols = [
            {wch: 10}, {wch: 15}, {wch: 20}, {wch: 25}, {wch: 12},
            {wch: 10}, {wch: 10}, {wch: 12}, {wch: 12},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 8}, {wch: 8}, {wch: 12}, {wch: 30}, {wch: 30}
        ];
        ws['!cols'] = wscols;
        
        const settingsData = [
            ['구장명', settings.clubName || ''],
            ['코치1', settings.coaches[0] || ''],
            ['코치2', settings.coaches[1] || ''],
            ['코치3', settings.coaches[2] || ''],
            ['코치4', settings.coaches[3] || ''],
            ['월회비 기본값1', settings.feePresets[0] || 0],
            ['월회비 기본값2', settings.feePresets[1] || 0],
            ['월회비 기본값3', settings.feePresets[2] || 0],
            ['월회비 기본값4', settings.feePresets[3] || 0],
            ['월회비 기본값5', settings.feePresets[4] || 0],
            ['은행명', settings.bankAccount?.bank || ''],
            ['계좌번호', settings.bankAccount?.accountNumber || '']
        ];
        
        const wsSettings = XLSX.utils.aoa_to_sheet(settingsData);
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "회원데이터");
        XLSX.utils.book_append_sheet(wb, wsSettings, "설정");
        
        const clubName = settings.clubName ? `_${settings.clubName}` : '';
        const fileName = `회원관리_데이터${clubName}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        showAlert(`${members.length}명의 회원 데이터를 엑셀 파일로 내보냈습니다!`);
        
    } catch (error) {
        console.error('엑셀 내보내기 오류:', error);
        showAlert(`엑셀 내보내기 중 오류가 발생했습니다: ${error.message}`);
    }
}

// 엑셀 템플릿 다운로드
function downloadTemplate() {
    try {
        const templateData = [
            [
                '이름', '전화번호', '이메일', '주소', '등록일(YYYY-MM-DD)', '월회비', '담당코치', '스케줄목표횟수', '현재스케줄횟수',
                '스케줄1_요일', '스케줄1_시작시간', '스케줄1_종료시간',
                '스케줄2_요일', '스케줄2_시작시간', '스케줄2_종료시간',
                '스케줄3_요일', '스케줄3_시작시간', '스케줄3_종료시간',
                '스케줄4_요일', '스케줄4_시작시간', '스케줄4_종료시간',
                '스케줄5_요일', '스케줄5_시작시간', '스케줄5_종료시간',
                '스케줄6_요일', '스케줄6_시작시간', '스케줄6_종료시간',
                '스케줄7_요일', '스케줄7_시작시간', '스케줄7_종료시간',
                '성별', '생년', '부수', '수상경력', '기타'
            ],
            [
                '홍길동', '010-1234-5678', 'hong@email.com', '서울시 강남구', '2024-01-15', '100000', '김코치', '8', '0',
                '월', '13:00', '13:20',
                '수', '15:00', '15:20',
                '', '', '',
                '', '', '',
                '', '', '',
                '', '', '',
                '', '', '',
                '남', '1990', '5부', '2023년 탁구대회 우승; 2022년 개인전 준우승', '특이사항 없음'
            ],
            ['※ 참고:', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['※ 요일: 월,화,수,목,금,토,일 중 선택', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['※ 시간 형식: 13:00, 14:30 등', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['※ 성별: 남 또는 여', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['※ 부수: 희망, 0부, 1부, 2부, ... 10부 중 선택', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['※ 수상경력: 여러 개일 경우 세미콜론(;)으로 구분', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(templateData);
        
        const wscols = [
            {wch: 10}, {wch: 15}, {wch: 20}, {wch: 25}, {wch: 12},
            {wch: 10}, {wch: 10}, {wch: 12}, {wch: 12},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 8}, {wch: 8}, {wch: 12}, {wch: 30}, {wch: 30}
        ];
        ws['!cols'] = wscols;
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "회원등록템플릿");
        
        XLSX.writeFile(wb, "회원등록_템플릿_스케줄7개.xlsx");
        showAlert('엑셀 템플릿이 다운로드되었습니다!');
        
    } catch (error) {
        console.error('템플릿 생성 오류:', error);
        showAlert('템플릿 생성 중 오류가 발생했습니다.');
    }
}

// 데이터 엑셀 가져오기
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        showAlert('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다!');
        event.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            const headers = jsonData[0];
            const rows = jsonData.slice(1);
            
            const importedMembers = [];
            
            rows.forEach(row => {
                if (row.length === 0 || !row[0]) return;
                
                let phone = row[1] || '';
                if (typeof phone === 'number') {
                    phone = phone.toString();
                    if (phone.length === 11 && phone.startsWith('010')) {
                        phone = phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
                    } else if (phone.length === 10) {
                        phone = phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
                    }
                }
                
                let skillLevel = null;
                const skillColumnIndex = 9 + (7 * 3) + 2;
                if (row[skillColumnIndex] !== undefined && row[skillColumnIndex] !== '') {
                    const skillText = String(row[skillColumnIndex]).trim();
                    if (skillText === '희망') {
                        skillLevel = -1;
                    } else if (skillText === '0부' || skillText === '선출') {
                        skillLevel = 0;
                    } else if (skillText.endsWith('부')) {
                        const level = parseInt(skillText.replace('부', ''));
                        if (!isNaN(level)) {
                            skillLevel = level;
                        }
                    }
                }
                
                let awards = [];
                const awardsColumnIndex = skillColumnIndex + 1;
                if (row[awardsColumnIndex] !== undefined && row[awardsColumnIndex] !== '') {
                    const awardsText = String(row[awardsColumnIndex]);
                    awards = awardsText.split(';').map(a => a.trim()).filter(a => a !== '');
                }
                
                const schedules = [];
                for (let i = 0; i < 7; i++) {
                    const baseIndex = 9 + (i * 3);
                    const day = row[baseIndex] ? String(row[baseIndex]) : '';
                    const startTime = row[baseIndex + 1] ? String(row[baseIndex + 1]) : '';
                    const endTime = row[baseIndex + 2] ? String(row[baseIndex + 2]) : '';
                    
                    if (day && startTime && endTime) {
                        schedules.push({ day, startTime, endTime });
                    }
                }
                
                const etcColumnIndex = awardsColumnIndex + 1;
                
                const member = {
                    name: String(row[0] || ''),
                    phone: phone,
                    email: String(row[2] || ''),
                    address: String(row[3] || ''),
                    registerDate: row[4] ? String(row[4]) : new Date().toISOString().split('T')[0],
                    fee: row[5] ? parseInt(row[5]) : null,
                    coach: String(row[6] || ''),
                    targetCount: row[7] ? parseInt(row[7]) : 0,
                    currentCount: row[8] ? parseInt(row[8]) : 0,
                    schedules: schedules,
                    gender: row[9 + (7 * 3)] ? String(row[9 + (7 * 3)]) : '',
                    birthYear: row[9 + (7 * 3) + 1] ? parseInt(row[9 + (7 * 3) + 1]) : null,
                    skillLevel: skillLevel,
                    awards: awards,
                    etc: row[etcColumnIndex] ? String(row[etcColumnIndex]) : '',
                    photo: '',
                    attendanceDates: [],
                    attendanceHistory: [],
                    paymentHistory: []
                };
                
                importedMembers.push(member);
            });
            
            if (workbook.SheetNames.length > 1) {
                const settingsSheetName = workbook.SheetNames[1];
                const settingsWorksheet = workbook.Sheets[settingsSheetName];
                const settingsJson = XLSX.utils.sheet_to_json(settingsWorksheet, { header: 1 });
                
                settingsJson.forEach(row => {
                    if (row.length >= 2) {
                        const key = row[0];
                        const value = row[1];
                        
                        if (key === '구장명') {
                            settings.clubName = String(value || '');
                            document.getElementById('clubNameDisplay').textContent = settings.clubName || '구장명을 설정하세요';
                        }
                        else if (key === '코치1') settings.coaches[0] = String(value || '');
                        else if (key === '코치2') settings.coaches[1] = String(value || '');
                        else if (key === '코치3') settings.coaches[2] = String(value || '');
                        else if (key === '코치4') settings.coaches[3] = String(value || '');
                        else if (key === '월회비 기본값1') settings.feePresets[0] = parseInt(value) || 0;
                        else if (key === '월회비 기본값2') settings.feePresets[1] = parseInt(value) || 0;
                        else if (key === '월회비 기본값3') settings.feePresets[2] = parseInt(value) || 0;
                        else if (key === '월회비 기본값4') settings.feePresets[3] = parseInt(value) || 0;
                        else if (key === '월회비 기본값5') settings.feePresets[4] = parseInt(value) || 0;
                        else if (key === '은행명') {
                            if (!settings.bankAccount) settings.bankAccount = {};
                            settings.bankAccount.bank = String(value || '');
                        }
                        else if (key === '계좌번호') {
                            if (!settings.bankAccount) settings.bankAccount = {};
                            settings.bankAccount.accountNumber = String(value || '');
                        }
                    }
                });
                
                updateFeePresetButtons();
                renderCoachButtons();
            }
            
            if (importedMembers.length > 0) {
                const importConfirmed = members.length === 0 || 
                    confirm(`현재 ${members.length}명의 회원이 있습니다. 엑셀 파일의 ${importedMembers.length}명으로 교체하시겠습니까?\n(주의: 기존 데이터는 삭제됩니다)`);
                
                if (importConfirmed) {
                    members = importedMembers;
                    filteredMembers = [...members];
                    saveToFirebase();
                    renderMembers();
                    renderSchedule();
                    showAlert(`${importedMembers.length}명의 회원 데이터를 성공적으로 가져왔습니다!`);
                }
            } else {
                showAlert('가져올 회원 데이터가 없습니다!');
            }
            
            closeSettings();
            
        } catch (error) {
            console.error('엑셀 가져오기 오류:', error);
            showAlert(`엑셀 파일 처리 중 오류가 발생했습니다: ${error.message}`);
        }
        
        event.target.value = '';
    };
    
    reader.readAsArrayBuffer(file);
}