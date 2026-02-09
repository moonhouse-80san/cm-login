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
            
            // ✅ 수정: confirm() 대신 showConfirm() 사용
            if (importedMembers.length > 0) {
                if (members.length === 0) {
                    // 기존 데이터가 없으면 바로 추가
                    members = importedMembers;
                    filteredMembers = [...members];
                    saveToFirebase();
                    renderMembers();
                    renderSchedule();
                    showAlert(`${importedMembers.length}명의 회원 데이터를 성공적으로 가져왔습니다!`);
                    closeSettings();
                } else {
                    // 기존 데이터가 있으면 확인 모달 사용
                    showConfirm(
                        `현재 ${members.length}명의 회원이 있습니다.\n엑셀 파일의 ${importedMembers.length}명으로 교체하시겠습니까?\n\n⚠️ 주의: 기존 데이터는 모두 삭제됩니다`,
                        function() {
                            // 확인 버튼 클릭 시
                            members = importedMembers;
                            filteredMembers = [...members];
                            saveToFirebase();
                            renderMembers();
                            renderSchedule();
                            showAlert(`${importedMembers.length}명의 회원 데이터를 성공적으로 가져왔습니다!`);
                            closeSettings();
                        },
                        function() {
                            // 취소 버튼 클릭 시
                            event.target.value = '';
                        }
                    );
                }
            } else {
                showAlert('가져올 회원 데이터가 없습니다!');
                closeSettings();
            }
            
        } catch (error) {
            console.error('엑셀 가져오기 오류:', error);
            showAlert(`엑셀 파일 처리 중 오류가 발생했습니다: ${error.message}`);
        }
        
        event.target.value = '';
    };
    
    reader.readAsArrayBuffer(file);
}