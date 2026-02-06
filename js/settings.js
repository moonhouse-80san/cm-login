function openSettings() {
    // 관리자만 접근 가능
    if (!checkPermissionBeforeSettings()) {
        return;
    }
    openSettingsDialog();
}

function openSettingsDialog() {
    document.getElementById('clubNameInput').value = settings.clubName || '';
    document.getElementById('feePreset1').value = settings.feePresets[0] || '';
    document.getElementById('feePreset2').value = settings.feePresets[1] || '';
    document.getElementById('feePreset3').value = settings.feePresets[2] || '';
    document.getElementById('feePreset4').value = settings.feePresets[3] || '';
    document.getElementById('feePreset5').value = settings.feePresets[4] || '';
    document.getElementById('adminUsername').value = settings.adminUser.username || '';
    document.getElementById('adminPassword').value = ''; // 보안상 비밀번호는 표시하지 않음

    document.getElementById('coachName1').value = settings.coaches[0] || '';
    document.getElementById('coachName2').value = settings.coaches[1] || '';
    document.getElementById('coachName3').value = settings.coaches[2] || '';
    document.getElementById('coachName4').value = settings.coaches[3] || '';

    renderSubAdminsList();
    document.getElementById('settingsModal').classList.add('active');
}

function closeSettings() {
    document.getElementById('settingsModal').classList.remove('active');
}

// 부관리자 목록 렌더링
function renderSubAdminsList() {
    const container = document.getElementById('subAdminsList');
    const subAdmins = settings.subAdmins || [];
    
    if (subAdmins.length === 0) {
        container.innerHTML = '<div style="padding: 10px; text-align: center; color: #999;">등록된 부관리자가 없습니다</div>';
        return;
    }
    
    container.innerHTML = subAdmins.map((sa, index) => `
        <div style="display: flex; gap: 10px; margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 8px; align-items: center;">
            <div style="flex: 1;">
                <div style="font-weight: 600; color: #2196F3;">🔰 ${sa.username}</div>
                <div style="font-size: 12px; color: #666;">비밀번호: ••••••</div>
            </div>
            <button onclick="removeSubAdmin(${index})" style="padding: 6px 12px; background: #f44336; color: white; border: none; border-radius: 6px; cursor: pointer;">
                삭제
            </button>
        </div>
    `).join('');
}

// 부관리자 추가
function addSubAdmin() {
    const username = prompt('부관리자 아이디를 입력하세요:');
    if (!username || username.trim() === '') return;
    
    const password = prompt('부관리자 비밀번호를 입력하세요:');
    if (!password || password.trim() === '') return;
    
    // 중복 확인
    if (settings.adminUser.username === username) {
        showAlert('관리자 아이디와 동일할 수 없습니다!');
        return;
    }
    
    if (settings.subAdmins.some(sa => sa.username === username)) {
        showAlert('이미 존재하는 아이디입니다!');
        return;
    }
    
    settings.subAdmins.push({
        id: Date.now().toString(),
        username: username.trim(),
        password: password.trim()
    });
    
    renderSubAdminsList();
    showAlert('부관리자가 추가되었습니다!');
}

// 부관리자 삭제
function removeSubAdmin(index) {
    if (confirm('이 부관리자를 삭제하시겠습니까?')) {
        settings.subAdmins.splice(index, 1);
        renderSubAdminsList();
        showAlert('부관리자가 삭제되었습니다!');
    }
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

    const newUsername = document.getElementById('adminUsername').value.trim();
    const newPassword = document.getElementById('adminPassword').value;
    
    if (newUsername) {
        settings.adminUser.username = newUsername;
    }
    if (newPassword) {
        settings.adminUser.password = newPassword;
    }

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
            '월회비', '담당코치', '레슨목표횟수', '현재레슨횟수',
            '스케줄1_요일', '스케줄1_시작시간', '스케줄1_종료시간',
            '스케줄2_요일', '스케줄2_시작시간', '스케줄2_종료시간',
            '스케줄3_요일', '스케줄3_시작시간', '스케줄3_종료시간',
            '스케줄4_요일', '스케줄4_시작시간', '스케줄4_종료시간',
            '스케줄5_요일', '스케줄5_시작시간', '스케줄5_종료시간',
            '스케줄6_요일', '스케줄6_시작시간', '스케줄6_종료시간',
            '스케줄7_요일', '스케줄7_시작시간', '스케줄7_종료시간',
            '성별', '생년', '부수(실력)', '수상경력', '기타'
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
            ['월회비 기본값5', settings.feePresets[4] || 0]
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
                '이름', '전화번호', '이메일', '주소', '등록일(YYYY-MM-DD)', '월회비', '담당코치', '레슨목표횟수', '현재레슨횟수',
                '스케줄1_요일', '스케줄1_시작시간', '스케줄1_종료시간',
                '스케줄2_요일', '스케줄2_시작시간', '스케줄2_종료시간',
                '스케줄3_요일', '스케줄3_시작시간', '스케줄3_종료시간',
                '스케줄4_요일', '스케줄4_시작시간', '스케줄4_종료시간',
                '스케줄5_요일', '스케줄5_시작시간', '스케줄5_종료시간',
                '스케줄6_요일', '스케줄6_시작시간', '스케줄6_종료시간',
                '스케줄7_요일', '스케줄7_시작시간', '스케줄7_종료시간',
                '성별', '생년', '부수(실력)', '수상경력', '기타'
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
            ['※ 부수(실력): 희망, 0부, 1부, 2부, ... 10부 중 선택', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
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