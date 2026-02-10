// member.js
// 전역 변수
let currentSort = 'registerDate'; // 기본 정렬을 등록일순으로 변경
let sortAscending = false; // 기본 정렬 방식을 내림차순(최신순)으로 변경

// 검색 함수
function searchMembers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const searchBar = document.getElementById('searchInput');
    
    if (searchBar) {
        searchBar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    if (searchTerm === '') {
        filteredMembers = [...members];
    } else {
        filteredMembers = members.filter(member => {
            return member.name.toLowerCase().includes(searchTerm) ||
                   (member.phone && String(member.phone).includes(searchTerm));
        });
    }
    
    if (currentSort === 'coach') {
        renderMembersByCoach();
    } else {
        sortMembers(currentSort, true);
    }
}

// 정렬 함수
function sortMembers(sortBy, fromSearch) {
    if (!fromSearch) {
        if (currentSort === sortBy) {
            sortAscending = !sortAscending;
        } else {
            // 등록일순은 기본적으로 내림차순(최신순), 이름순은 기본적으로 오름차순
            sortAscending = (sortBy === 'name') ? true : false;
        }
        currentSort = sortBy;

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            const labels = { name: '이름순', registerDate: '등록일순', coach: '코치별' };
            btn.textContent = labels[btn.dataset.sort] || btn.textContent;
        });
        const activeBtn = document.querySelector('.filter-btn[data-sort="' + sortBy + '"]');
        if (activeBtn) {
            activeBtn.classList.add('active');
            if (sortBy !== 'coach') {
                // 등록일순일 때는 기본이 내림차순(최신순) 표시
                if (sortBy === 'registerDate') {
                    activeBtn.textContent += sortAscending ? ' ▲' : ' ▼';
                } else {
                    activeBtn.textContent += sortAscending ? ' ▲' : ' ▼';
                }
            }
        }
    }
    
    if (sortBy === 'coach') {
        renderMembersByCoach();
        return;
    }
    
    let sortTarget = filteredMembers;
    
    switch(sortBy) {
        case 'name':
            sortTarget.sort((a, b) => {
                const nameA = a.name || '';
                const nameB = b.name || '';
                const cmp = nameA.localeCompare(nameB, 'ko');
                return sortAscending ? cmp : -cmp;
            });
            break;
        case 'registerDate':
            sortTarget.sort((a, b) => {
                if (!a.registerDate && !b.registerDate) return 0;
                if (!a.registerDate) return 1; // 등록일 없는 항목을 뒤로
                if (!b.registerDate) return -1; // 등록일 없는 항목을 뒤로
                const dateA = new Date(a.registerDate);
                const dateB = new Date(b.registerDate);
                // sortAscending이 true면 오름차순(오래된순), false면 내림차순(최신순)
                return sortAscending ? dateA - dateB : dateB - dateA;
            });
            break;
    }
    
    filteredMembers = sortTarget;
    renderMembers();
}

// 기본 회원 목록 렌더링
function renderMembers() {
    if (currentSort === 'coach') {
        renderMembersByCoach();
        return;
    }
    
    const listEl = document.getElementById('listSection');
    const countEl = document.getElementById('memberCount');

    countEl.textContent = members.length + '명';

    if (filteredMembers.length === 0) {
        listEl.innerHTML = '<div class="empty-state">' +
            '<svg fill="currentColor" viewBox="0 0 20 20">' +
                '<path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>' +
            '</svg>' +
            '<p>' + (document.getElementById('searchInput').value ? '검색 결과가 없습니다' : '등록된 회원이 없습니다') + '</p>' +
        '</div>';
        return;
    }

    listEl.innerHTML = filteredMembers.map((member, index) => {
        const originalIndex = members.indexOf(member);
        const phoneLink = member.phone ? 
            '<div><a href="tel:' + String(member.phone).replace(/-/g, '') + '" class="phone-link">📞 ' + member.phone + '</a></div>' : '';

        let scheduleBadges = '';
        if (member.schedules && member.schedules.length > 0) {
            member.schedules.forEach(schedule => {
                if (schedule.day && schedule.startTime && schedule.endTime) {
                    scheduleBadges += '<span class="schedule-badge">' + dayNames[schedule.day] + ' ' + schedule.startTime + '~' + schedule.endTime + '</span>';
                }
            });
        }

        const currentCount = member.currentCount || 0;
        const targetCount = member.targetCount || 0;

        let attendanceCount = '';
        if (targetCount > 0) {
            attendanceCount = '<span class="attendance-count" style="display: inline-flex; align-items: center; gap: 3px; padding: 2px 6px; background: #fff; color: #ff6600; border-radius: 2px; font-size: 14px; font-weight: 500; margin-left: 5px; white-space: nowrap;">📊 ' + currentCount + '/' + targetCount + '회</span>';
        }

        let coachBadge = '';
        if (member.coach) {
            coachBadge = '<span class="coach-badge">🏋️ ' + member.coach + '</span>';
        }

        const hasPermission = canEditMember(member);
        const editBtnClass = hasPermission ? 'btn-edit' : 'btn-edit btn-edit-disabled btn-hidden';
        const deleteBtnClass = hasPermission ? 'btn-delete' : 'btn-delete btn-delete-disabled btn-hidden';

        return '<div class="member-card">' +
            '<div class="member-content">' +
                '<div class="member-header">' +
                    '<div class="member-name" style="cursor: pointer; color: #000; text-decoration: none;" onclick="showMemberDetails(' + originalIndex + ')">' +
                        '<span class="mcardn">' + member.name + '</span>' +
                        attendanceCount +
                    '</div>' +
                    '<div class="member-actions">' +
                        '<button class="' + editBtnClass + '" data-index="' + originalIndex + '" onclick="editMember(' + originalIndex + ');">수정</button>' +
                        '<button class="' + deleteBtnClass + '" data-index="' + originalIndex + '" onclick="checkPermissionBeforeDelete(' + originalIndex + ');">삭제</button>' +
                    '</div>' +
                '</div>' +
                '<div class="member-info">' +
                    '<div class="phone-fee-row">' +
                        phoneLink +
                        (member.fee !== null && member.fee !== undefined ? '<span class="member-fee">💰 월회비:' + formatNumber(member.fee) + '원</span>' : '') +
                    '</div>' +
                    '<div class="member-meta-row">' +
                        coachBadge +
                        (scheduleBadges ? '<div class="schedule-container">' + scheduleBadges + '</div>' : '') +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    }).join('');
}

// 코치별 회원 목록 렌더링
function renderMembersByCoach() {
    const listEl = document.getElementById('listSection');
    const countEl = document.getElementById('memberCount');

    countEl.textContent = members.length + '명';

    if (filteredMembers.length === 0) {
        listEl.innerHTML = '<div class="empty-state">' +
            '<svg fill="currentColor" viewBox="0 0 20 20">' +
                '<path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>' +
            '</svg>' +
            '<p>' + (document.getElementById('searchInput').value ? '검색 결과가 없습니다' : '등록된 회원이 없습니다') + '</p>' +
        '</div>';
        return;
    }

    // 코치별로 회원 분류
    const membersByCoach = {};
    const noCoachMembers = [];
    
    filteredMembers.forEach(member => {
        const coach = member.coach || '코치 미지정';
        if (!membersByCoach[coach]) {
            membersByCoach[coach] = [];
        }
        membersByCoach[coach].push(member);
    });

    // 코치별로 회원을 등록일 최신순으로 정렬
    Object.keys(membersByCoach).forEach(coach => {
        membersByCoach[coach].sort((a, b) => {
            if (!a.registerDate && !b.registerDate) return 0;
            if (!a.registerDate) return 1;
            if (!b.registerDate) return -1;
            return new Date(b.registerDate) - new Date(a.registerDate); // 최신순
        });
    });

    // 코치명으로 정렬 (코치 미지정은 마지막에)
    const sortedCoaches = Object.keys(membersByCoach).sort((a, b) => {
        if (a === '코치 미지정') return 1;
        if (b === '코치 미지정') return -1;
        return a.localeCompare(b);
    });

    let html = '';
    
    sortedCoaches.forEach(coach => {
        const coachMembers = membersByCoach[coach];
        const coachLabel = coach === '코치 미지정' ? '코치 미지정' : '🏋️ ' + coach;
        
        html += '<div class="coach-section">' +
            '<div class="coach-header" onclick="toggleCoachSection(\'' + coach + '\')">' +
                '<div class="coach-title">' +
                    '<span class="coach-toggle-icon">▼</span>' +
                    '<span class="coach-name">' + coachLabel + '</span>' +
                    '<span class="coach-count">' + coachMembers.length + '명</span>' +
                '</div>' +
            '</div>' +
            '<div class="coach-members" id="coach-' + coach + '">';

        coachMembers.forEach((member, index) => {
            const originalIndex = members.indexOf(member);
            const phoneLink = member.phone ? 
                '<div><a href="tel:' + String(member.phone).replace(/-/g, '') + '" class="phone-link">📞 ' + member.phone + '</a></div>' : '';

            let scheduleBadges = '';
            if (member.schedules && member.schedules.length > 0) {
                member.schedules.forEach(schedule => {
                    if (schedule.day && schedule.startTime && schedule.endTime) {
                        scheduleBadges += '<span class="schedule-badge">' + dayNames[schedule.day] + ' ' + schedule.startTime + '~' + schedule.endTime + '</span>';
                    }
                });
            }

            const currentCount = member.currentCount || 0;
            const targetCount = member.targetCount || 0;

            let attendanceCount = '';
            if (targetCount > 0) {
                attendanceCount = '<span class="attendance-count" style="display: inline-flex; align-items: center; gap: 3px; padding: 2px 6px; background: #fff; color: #ff6600; border-radius: 2px; font-size: 14px; font-weight: 500; margin-left: 5px; white-space: nowrap;">📊 ' + currentCount + '/' + targetCount + '회</span>';
            }

            const hasPermission = canEditMember(member);
            const editBtnClass = hasPermission ? 'btn-edit' : 'btn-edit btn-edit-disabled btn-hidden';
            const deleteBtnClass = hasPermission ? 'btn-delete' : 'btn-delete btn-delete-disabled btn-hidden';

            html += '<div class="member-card">' +
                '<div class="member-content">' +
                    '<div class="member-header">' +
                        '<div class="member-name" style="cursor: pointer; color: #000; text-decoration: none;" onclick="showMemberDetails(' + originalIndex + ')">' +
                            '<span class="mcardn">' + member.name + '</span>' +
                            attendanceCount +
                        '</div>' +
                        '<div class="member-actions">' +
                            '<button class="' + editBtnClass + '" data-index="' + originalIndex + '" onclick="editMember(' + originalIndex + ');">수정</button>' +
                            '<button class="' + deleteBtnClass + '" data-index="' + originalIndex + '" onclick="checkPermissionBeforeDelete(' + originalIndex + ');">삭제</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="member-info">' +
                        '<div class="phone-fee-row">' +
                            phoneLink +
                            (member.fee !== null && member.fee !== undefined ? '<span class="member-fee">💰 월회비:' + formatNumber(member.fee) + '원</span>' : '') +
                        '</div>' +
                        '<div class="member-meta-row">' +
                            (scheduleBadges ? '<div class="schedule-container">' + scheduleBadges + '</div>' : '') +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        });

        html += '</div></div>';
    });

    listEl.innerHTML = html;
}

function toggleCoachSection(coach) {
    const section = document.getElementById('coach-' + coach);
    if (section) {
        const isHidden = section.style.display === 'none';
        section.style.display = isHidden ? 'block' : 'none';
        
        const coachHeader = document.querySelector('#coach-' + coach).parentElement.querySelector('.coach-toggle-icon');
        if (coachHeader) {
            coachHeader.textContent = isHidden ? '▼' : '▶';
        }
    }
}

// 회원 상세 정보 팝업
function showMemberDetails(index) {
    const member = members[index];
    
    let detailsHTML = '<div class="member-details-modal">' +
        '<div class="member-details-header">' +
            '<h2>' + member.name + '</h2>' +
            '<button class="close-btn" onclick="closeMemberDetails()">×</button>' +
        '</div>' +
        '<div class="member-details-content">';
    
    if (member.photo) {
        detailsHTML += '<div class="member-details-photo">' +
            '<img src="' + member.photo + '" alt="' + member.name + '" style="width: 200px; height: 200px; border-radius: 10px; object-fit: cover; margin-bottom: 20px;">' +
        '</div>';
    }
    
    detailsHTML += '<div class="member-details-section">' +
        '<h3>기본 정보</h3>' +
        '<table class="member-details-table">';
    
    if (member.phone) {
        detailsHTML += '<tr><td>📞 전화번호:</td><td><a href="tel:' + String(member.phone).replace(/-/g, '') + '">' + member.phone + '</a></td></tr>';
    }
    if (member.email) {
        detailsHTML += '<tr><td>📧 이메일:</td><td>' + member.email + '</td></tr>';
    }
    if (member.address) {
        detailsHTML += '<tr><td>📍 주소:</td><td>' + member.address + '</td></tr>';
    }
    if (member.registerDate) {
        detailsHTML += '<tr><td>📅 등록일:</td><td>' + formatDate(member.registerDate) + '</td></tr>';
    }
    if (member.fee) {
        detailsHTML += '<tr><td>💰 월회비:</td><td>' + formatNumber(member.fee) + '원</td></tr>';
    }
    if (member.coach) {
        detailsHTML += '<tr><td>🏋️ 담당 코치:</td><td><strong>' + member.coach + '</strong></td></tr>';
    }
    if (member.gender) {
        detailsHTML += '<tr><td>⚤ 성별:</td><td>' + member.gender + '</td></tr>';
    }
    
    if (canEditMember(member) && member.birthYear) {
        detailsHTML += '<tr><td>🎂 생년:</td><td>' + member.birthYear + '년생</td></tr>';
    }
    
    if (member.skillLevel !== undefined && member.skillLevel !== null) {
        const skillLevel = parseInt(member.skillLevel);
        let skillText = '';
        if (skillLevel === -2) skillText = '선수출신';
        else if (skillLevel === -1) skillText = '희망';
        else if (skillLevel === 0) skillText = '0부';
        else skillText = skillLevel + '부';
        detailsHTML += '<tr><td>🏓 부수:</td><td>' + skillText + '</td></tr>';
    }
    
    const targetCount = member.targetCount || 0;
    const currentCount = member.currentCount || 0;
    if (targetCount > 0) {
        detailsHTML += '<tr><td>📊 현재 레슨:</td><td>' + currentCount + '/' + targetCount + '회</td></tr>';
    }
    
    detailsHTML += '</table></div>';

    if (canEditMember(member) && member.privateMemo) {
        detailsHTML += '<div class="member-details-section">' +
            '<h3>📝 비밀글 (관리자용)</h3>' +
            '<div class="etc-details" style="background: #fff8e1; border-left: 4px solid #FF9800;">' +
                member.privateMemo.replace(/\n/g, '<br>') +
            '</div>' +
        '</div>';
    }
    
    if (canEditMember(member)) {
        const payments = member.paymentHistory || [];
        if (payments.length > 0) {
            const sortedPayments = payments.slice().sort((a, b) => b.date.localeCompare(a.date));
            const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

            detailsHTML += '<div class="member-details-section">' +
                '<h3>💳 회비 입금 내역</h3>' +
                '<table class="payment-history-table">' +
                    '<thead><tr><th>입금날</th><th>입금금액</th></tr></thead>' +
                    '<tbody>';
            sortedPayments.forEach(p => {
                detailsHTML += '<tr><td>' + formatDate(p.date) + '</td><td>' + formatNumber(p.amount) + '원</td></tr>';
            });
            detailsHTML += '</tbody></table>' +
                '<div class="payment-history-total">' +
                    '<span class="total-label">합계:</span>' +
                    '<span>' + formatNumber(totalAmount) + '원</span>' +
                '</div>' +
            '</div>';
        }
    }
    
    const memberSchedules = [];
    if (member.schedules && member.schedules.length > 0) {
        memberSchedules.push.apply(memberSchedules, member.schedules);
    }
    
    if (memberSchedules.length > 0) {
        detailsHTML += '<div class="member-details-section">' +
            '<h3>스케줄</h3>' +
            '<table class="member-details-table">';
        memberSchedules.forEach((schedule, index) => {
            detailsHTML += '<tr><td>📅 스케줄 ' + (index + 1) + ':</td><td>' + dayNames[schedule.day] + ' ' + schedule.startTime + '~' + schedule.endTime + '</td></tr>';
        });
        detailsHTML += '</table></div>';
    }
    
    const currentDates = member.attendanceDates || [];
    const historyDates = member.attendanceHistory || [];
    
    // 현재 진행 중인 레슨 기록
    if (currentDates.length > 0) {
        detailsHTML += '<div class="member-details-section">' +
            '<h3>📚 현재 진행 중인 레슨 (' + currentDates.length + '회)</h3>' +
            '<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">';
        
        const sortedCurrentDates = currentDates.slice().sort((a, b) => b.localeCompare(a));
        sortedCurrentDates.forEach(date => {
            const formattedDate = formatDate(date);
            detailsHTML += '<div style="display: inline-flex; align-items: center; background: #e3f2fd; border-radius: 6px; padding: 4px 10px; margin-left: 10px;">' +
                '<span style="color: #1976d2; font-size: 14px;">' + formattedDate + '</span>' +
                '<span style="color: #f44336; cursor: pointer; font-size: 20px; font-weight: bold; margin-left: 8px;" onclick="deleteAttendanceDate(' + index + ', \'' + date + '\', \'current\')">×</span>' +
            '</div>';
        });
        
        detailsHTML += '</div></div>';
    }
    
    // 완료된 레슨 기록
    if (historyDates.length > 0) {
        detailsHTML += '<div class="member-details-section" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom:10px; border-bottom:1px solid #e0e0e0;">' +
            '<h4 style="margin: 0; border: none;">✅ 완료된 레슨 기록 (' + historyDates.length + '회)</h4>' +
            '<div>' +
                '<button onclick="showHistoryModal(' + index + ')" style="padding: 6px 12px; background: linear-gradient(135deg, #4CAF50, #45a049); color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600; box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3); transition: all 0.3s;">' +
                    '보기' +
                '</button>' +
            '</div>' +
        '</div>';
    }
    
    if (currentDates.length === 0 && historyDates.length === 0) {
        detailsHTML += '<div class="member-details-section">' +
            '<h3>📚 레슨 기록</h3>' +
            '<p style="text-align: center; color: #999; padding: 20px;">레슨 기록이 없습니다.</p>' +
        '</div>';
    }

    if (member.awards && member.awards.length > 0) {
        detailsHTML += '<div class="member-details-section">' +
            '<h3>🏆 수상경력</h3>' +
            '<div class="awards-details">';
        member.awards.forEach((award, index) => {
            detailsHTML += '<div class="award-item">' + (index + 1) + '. ' + award + '</div>';
        });
        detailsHTML += '</div></div>';
    }
    
    if (member.etc) {
        detailsHTML += '<div class="member-details-section">' +
            '<h3>📝 기타</h3>' +
            '<div class="etc-details">' +
                member.etc.replace(/\n/g, '<br>') +
            '</div>' +
        '</div>';
    }

    detailsHTML += '</div>' +
        '<div class="member-details-footer">';
    
    if (canEditMember(member)) {
        detailsHTML += '<button class="btn btn-edit" onclick="editMember(' + index + '); closeMemberDetails();">수정</button>';
    }
    
    detailsHTML += '<button class="btn btn-secondary" onclick="closeMemberDetails()">닫기</button>' +
        '</div>' +
    '</div>';
    
    const modal = document.createElement('div');
    modal.id = 'memberDetailsModal';
    modal.className = 'modal active';
    modal.innerHTML = detailsHTML;
    document.body.appendChild(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeMemberDetails();
        }
    });
}

function showHistoryModal(memberIndex) {
    const member = members[memberIndex];
    const historyDates = member.attendanceHistory || [];
    
    if (historyDates.length === 0) {
        showAlert('완료된 레슨 기록이 없습니다.');
        return;
    }
    
    const sortedHistoryDates = historyDates.slice().sort((a, b) => b.localeCompare(a));
    
    const byMonth = {};
    sortedHistoryDates.forEach(date => {
        const monthKey = date.substring(0, 7);
        if (!byMonth[monthKey]) {
            byMonth[monthKey] = [];
        }
        byMonth[monthKey].push(date);
    });
    
    let historyHTML = '<div class="member-details-modal" style="max-width: 600px;">' +
        '<div class="member-details-header">' +
            '<h4>✅ ' + member.name + ' - 완료된 레슨 기록</h4>' +
            '<button class="close-btn" onclick="closeHistoryModal()">×</button>' +
        '</div>' +
        '<div class="member-details-content" style="max-height: 70vh; overflow-y: auto;">';
    
    historyHTML += '<div style="background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 5px; border-radius: 12px; margin-bottom: 10px; text-align: center;">' +
        '<div style="font-size: 14px; font-weight: 700; margin-bottom: 1px;">총 ' + historyDates.length + '회</div>' +
        '<div style="font-size: 14px; opacity: 0.9;">레슨을 완료했습니다!</div>' +
    '</div>';
    
    // 전체 삭제 버튼 추가
    historyHTML += '<div style="text-align: right; margin-bottom: 20px;">' +
        '<button onclick="deleteAllAttendanceHistory(' + memberIndex + '); closeHistoryModal();" style="padding: 8px 16px; background: linear-gradient(135deg, #f44336, #d32f2f); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3); transition: all 0.3s;">' +
            '🗑️ 전체 기록 삭제' +
        '</button>' +
    '</div>';
    
    const sortedMonths = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));
    
    sortedMonths.forEach(monthKey => {
        const dates = byMonth[monthKey];
        const year = monthKey.substring(0, 4);
        const month = monthKey.substring(5, 7);
        
        historyHTML += '<div style="margin-bottom: 25px;">' +
            '<div style="font-size: 18px; font-weight: 600; color: #333; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #4CAF50;">' +
                '📅 ' + year + '년 ' + month + '월 (' + dates.length + '회)' +
            '</div>' +
            '<div style="display: flex; flex-wrap: wrap; gap: 8px;">';
        
        dates.forEach(date => {
            const formattedDate = formatDate(date);
            historyHTML += '<div style="display: inline-flex; align-items: center; background: #f1f8e9; border-radius: 6px; padding:1px;">' +
                '<span style="color: #558b2f; font-size: 12px;">' + formattedDate + '</span>' +
                '<span style="color: #f44336; cursor: pointer; font-size: 14px; font-weight: bold; margin-left: 5px;" onclick="deleteAttendanceDate(' + memberIndex + ', \'' + date + '\', \'history\')">×</span>' +
            '</div>';
        });
        
        historyHTML += '</div></div>';
    });
    
    historyHTML += '</div>' +
        '<div class="member-details-footer">' +
            '<button class="btn btn-secondary" onclick="closeHistoryModal()">닫기</button>' +
        '</div>' +
    '</div>';
    
    const modal = document.createElement('div');
    modal.id = 'historyModal';
    modal.className = 'modal active';
    modal.style.zIndex = '10003';
    modal.innerHTML = historyHTML;
    document.body.appendChild(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeHistoryModal();
        }
    });
}

// ==================== 레슨 기록 삭제 함수들 ====================

// 개별 레슨 기록 삭제
function deleteAttendanceDate(memberIndex, date, type) {
    if (!hasEditPermission()) {
        showAlert('삭제 권한이 없습니다. 로그인해주세요!');
        openLoginModal();
        return;
    }
    if (!canEditMemberByIndex(memberIndex)) {
        showAlert('이 회원의 레슨 기록을 수정할 권한이 없습니다.');
        return;
    }
    
    // confirm() 대신 showConfirm() 사용
    showConfirm(
        date + ' 레슨 기록을 삭제하시겠습니까?',
        function() {
            const member = members[memberIndex];
            
            if (type === 'current') {
                // 현재 진행 중인 레슨에서 삭제
                if (member.attendanceDates) {
                    const index = member.attendanceDates.indexOf(date);
                    if (index !== -1) {
                        member.attendanceDates.splice(index, 1);
                        // 현재 레슨 횟수 감소
                        member.currentCount = Math.max(0, (member.currentCount || 0) - 1);
                    }
                }
            } else if (type === 'history') {
                // 완료된 레슨 기록에서 삭제
                if (member.attendanceHistory) {
                    const index = member.attendanceHistory.indexOf(date);
                    if (index !== -1) {
                        member.attendanceHistory.splice(index, 1);
                    }
                }
            }
            
            saveToFirebase();
            
            // 현재 열려있는 모달 닫고 새로고침
            closeMemberDetails();
            closeHistoryModal();
            
            // 약간의 딜레이 후 상세정보 다시 열기
            setTimeout(() => {
                showMemberDetails(memberIndex);
                showAlert('레슨 기록이 삭제되었습니다.');
            }, 300);
        }
    );
}

// 모든 완료된 레슨 기록 삭제
function deleteAllAttendanceHistory(memberIndex) {
    if (!hasEditPermission()) {
        showAlert('삭제 권한이 없습니다. 로그인해주세요!');
        openLoginModal();
        return;
    }
    if (!canEditMemberByIndex(memberIndex)) {
        showAlert('이 회원의 레슨 기록을 수정할 권한이 없습니다.');
        return;
    }
    
    // confirm() 대신 showConfirm() 사용
    showConfirm(
        '모든 완료된 레슨 기록을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
        function() {
            const member = members[memberIndex];
            member.attendanceHistory = [];
            
            saveToFirebase();
            
            // 현재 열려있는 모달 닫고 새로고침
            closeMemberDetails();
            
            // 약간의 딜레이 후 상세정보 다시 열기
            setTimeout(() => {
                showMemberDetails(memberIndex);
                showAlert('모든 완료된 레슨 기록이 삭제되었습니다.');
            }, 300);
        }
    );
}

function closeHistoryModal() {
    const modal = document.getElementById('historyModal');
    if (modal) {
        modal.remove();
    }
}

function getAllAttendanceDates(member) {
    const history = member.attendanceHistory || [];
    const current = member.attendanceDates || [];
    const allSet = new Set();
    history.forEach(date => allSet.add(date));
    current.forEach(date => allSet.add(date));
    return Array.from(allSet);
}

function closeMemberDetails() {
    const modal = document.getElementById('memberDetailsModal');
    if (modal) {
        modal.remove();
    }
}

function editMember(index) {
    if (!canEditMemberByIndex(index)) {
        showAlert('이 회원을 수정할 권한이 없습니다.');
        return;
    }
    const member = members[index];
    
    const formSection = document.querySelector('.form-section');
    if (formSection) {
        formSection.classList.add('form-edit-mode');
    }
    
    document.getElementById('name').value = member.name;
    document.getElementById('phone').value = member.phone || '';
    document.getElementById('registerDate').value = member.registerDate || '';
    document.getElementById('fee').value = member.fee !== null && member.fee !== undefined ? member.fee : '';
    document.getElementById('email').value = member.email || '';
    document.getElementById('address').value = member.address || '';
    document.getElementById("targetCount").value = member.targetCount || 0;
    document.getElementById("currentCount").value = member.currentCount || 0;

    setSelectedCoach(member.coach || '');
    setSelectedGender(member.gender || '');
    document.getElementById('birthYear').value = member.birthYear || '';
    document.getElementById('skillLevel').value = member.skillLevel !== null && member.skillLevel !== undefined ? member.skillLevel : '';
    document.getElementById('etc').value = member.etc || '';
    
    const privateMemoSection = document.getElementById('privateMemoSection');
    const privateMemoInput = document.getElementById('privateMemo');
    if (canEditMember(member)) {
        privateMemoSection.style.display = 'block';
        privateMemoInput.value = member.privateMemo || '';
    } else {
        privateMemoSection.style.display = 'none';
        privateMemoInput.value = '';
    }
    
    setAwardsList(member.awards || []);

    if (member.schedules && member.schedules.length > 0) {
        setSchedulesData(member.schedules);
    } else {
        setSchedulesData(null);
    }

    document.getElementById('paymentSection').style.display = 'block';
    renderPaymentList(member.paymentHistory || []);
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('paymentAmount').value = member.fee !== null && member.fee !== undefined ? member.fee : '';

    if (member.photo) {
        currentPhotoData = member.photo;
        displayPhotoPreview();
    } else {
        currentPhotoData = null;
        displayPhotoPreview();
    }

    isPhotoRemoved = false;
    currentEditIndex = index;
    
	// 이름 입력란으로 스크롤 (화면 중앙에 배치)
	setTimeout(() => {
		const nameInput = document.getElementById('name');
		if (nameInput) {
			nameInput.scrollIntoView({ behavior: 'smooth', block: 'start' });
			
			// 포커스 및 선택
			setTimeout(() => {
				nameInput.setAttribute('readonly', 'readonly');
				nameInput.focus();
				nameInput.select();
				setTimeout(() => {
					nameInput.removeAttribute('readonly');
				}, 100);
			}, 300);
		}
	}, 100);
}

function renderSchedule() {
    const scheduleEl = document.getElementById('scheduleContent');

    const scheduleByDay = {};
    daysOfWeek.forEach(day => {
        scheduleByDay[day] = [];
    });

    members.forEach(member => {
        if (member.schedules && member.schedules.length > 0) {
            member.schedules.forEach(schedule => {
                if (schedule.day && schedule.startTime && schedule.endTime) {
                    scheduleByDay[schedule.day].push({
                        name: member.name,
                        startTime: schedule.startTime,
                        endTime: schedule.endTime,
                        coach: member.coach || ''
                    });
                }
            });
        }
    });

    let scheduleHTML = '';
    
    daysOfWeek.forEach(day => {
        const dayMembers = scheduleByDay[day];

        const timeSlots = {};
        dayMembers.forEach(member => {
            const timeKey = member.startTime + '-' + member.endTime;
            if (!timeSlots[timeKey]) {
                timeSlots[timeKey] = {
                    startTime: member.startTime,
                    endTime: member.endTime,
                    members: []
                };
            }
            timeSlots[timeKey].members.push({ name: member.name, coach: member.coach });
        });

        const sortedTimeSlots = Object.values(timeSlots).sort((a, b) => {
            return a.startTime.localeCompare(b.startTime);
        });

        scheduleHTML += '<div class="day-section" data-day-section="' + day + '">' +
            '<div class="day-section-header" onclick="toggleDaySection(\'' + day + '\')">' +
                '<div class="day-title">' +
                    '<span class="toggle-icon">▼</span>' +
                    '<span class="day-name">' + dayNames[day] + '</span>' +
                    '<span class="day-count">' + dayMembers.length + '명</span>' +
                '</div>' +
            '</div>' +
            '<div class="day-schedule-content">';

        if (sortedTimeSlots.length === 0) {
            scheduleHTML += '<div class="no-schedule">등록된 스케줄이 없습니다</div>';
        } else {
            sortedTimeSlots.forEach(slot => {
                scheduleHTML += '<div class="time-slot">' +
                    '<div class="time-range">' + slot.startTime + ' ~ ' + slot.endTime + '</div>' +
                    '<div class="time-members">';
                slot.members.forEach(m => {
                    const coachTag = m.coach ? '<span class="time-member-coach">' + m.coach + '</span>' : '';
                    scheduleHTML += '<span class="time-member">' + m.name + coachTag + '</span>';
                });
                scheduleHTML += '</div></div>';
            });
        }

        scheduleHTML += '</div></div>';
    });
    
    scheduleEl.innerHTML = scheduleHTML;
}

function toggleDaySection(day) {
    const section = document.querySelector('[data-day-section="' + day + '"]');
    if (section) {
        const isCollapsed = section.classList.contains('collapsed');
        section.classList.toggle('collapsed');
        
        const toggleIcon = section.querySelector('.toggle-icon');
        if (toggleIcon) {
            toggleIcon.textContent = isCollapsed ? '▼' : '▶';
        }
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.querySelectorAll('.schedule-section').forEach(section => {
        section.classList.remove('active');
    });

    if (tabName === 'list') {
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('listSection').style.display = 'block';
        document.getElementById('scheduleSection').classList.remove('active');
    } else if (tabName === 'schedule') {
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('listSection').style.display = 'none';
        document.getElementById('scheduleSection').classList.add('active');
        renderSchedule();
    }
}

// 앱 초기화 시 등록일 최신순(내림차순)으로 자동 정렬
document.addEventListener('DOMContentLoaded', function() {
    // 페이지 로드 시 등록일 최신순 정렬 버튼 활성화
    setTimeout(() => {
        const registerDateBtn = document.querySelector('.filter-btn[data-sort="registerDate"]');
        if (registerDateBtn) {
            registerDateBtn.classList.add('active');
            registerDateBtn.textContent = '등록일순 ▼'; // ▼ 표시 = 내림차순(최신순)
        }
        
        // 회원 데이터가 있으면 등록일 최신순으로 정렬 적용
        setTimeout(() => {
            if (members.length > 0) {
                filteredMembers = [...members];
                sortMembers('registerDate', true);
            }
        }, 800);
    }, 300);
});
