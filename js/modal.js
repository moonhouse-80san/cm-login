// 현재 수정 중인 회원의 레슨 초기화
function resetCurrentAttendance() {
    if (!hasEditPermission()) {
        showAlert('먼저 로그인해주세요!');
        openLoginModal();
        return;
    }
    if (!canEditMemberByIndex(currentEditIndex)) {
        showAlert('이 회원의 레슨을 초기화할 권한이 없습니다.');
        return;
    }

    if (currentEditIndex === null) {
        showAlert('먼저 수정할 회원을 선택해주세요!');
        return;
    }

    document.getElementById('confirmModal').classList.add('active');
}

// 레슨 초기화 실행
function confirmResetAttendance() {
    document.getElementById('confirmModal').classList.remove('active');

    const member = members[currentEditIndex];

    if (!member.attendanceHistory) {
        member.attendanceHistory = [];
    }
    if (member.attendanceDates && member.attendanceDates.length > 0) {
        member.attendanceDates.forEach(date => {
            if (!member.attendanceHistory.includes(date)) {
                member.attendanceHistory.push(date);
            }
        });
    }

    member.currentCount = 0;
    member.attendanceDates = [];
    
    document.getElementById('currentCount').value = 0;
    
    saveToFirebase();
    renderMembers();
    
    const calendar = document.getElementById('formCalendar');
    if (calendar.style.display !== 'none') {
        renderFormCalendar();
    }
    
    showAlert(`${member.name} 회원의 레슨이 초기화되었습니다. (0/${member.targetCount || 0}회)\n레슨 기록은 유지됩니다.`);
}

// 레슨 초기화 모달 닫기
function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
}

// 삭제 모달 표시
function showDeleteModal(index) {
    deleteIndex = index;
    document.getElementById('deleteModal').classList.add('active');
}

function confirmDelete() {
    if (deleteIndex !== null) {
        members.splice(deleteIndex, 1);
        saveToFirebase();
        filteredMembers = [...members];
        renderMembers();
        renderSchedule();
        deleteIndex = null;
        closeModal();
        showAlert('회원이 삭제되었습니다!');
    }
}

function closeModal() {
    document.getElementById('deleteModal').classList.remove('active');
}

// 알림 모달
function showAlert(message) {
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('alertModal').classList.add('active');
}

function closeAlertModal() {
    document.getElementById('alertModal').classList.remove('active');
}

// ==================== 커스텀 Confirm 모달 (수정됨) ====================
// 브라우저 기본 confirm() 대신 사용하여 주소 표시 제거
function showConfirm(message, onConfirm, onCancel) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'customConfirmModal';
    modal.style.zIndex = '10010'; // 다른 모달보다 위에 표시
    modal.innerHTML = `
        <div class="modal-content">
            <p style="white-space: pre-line; line-height: 1.6;">${message}</p>
            <div class="modal-buttons">
                <button style="background: #2196F3;" id="confirmYes">확인</button>
                <button style="background: #9E9E9E;" id="confirmNo">취소</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // 확인 버튼 클릭
    document.getElementById('confirmYes').onclick = function() {
        modal.remove();
        if (onConfirm) onConfirm();
    };
    
    // 취소 버튼 클릭
    document.getElementById('confirmNo').onclick = function() {
        modal.remove();
        if (onCancel) onCancel();
    };
    
    // 배경 클릭 시 취소 (모달 닫기)
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
            if (onCancel) onCancel();
        }
    });
    
    // ESC 키로 모달 닫기
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            const customModal = document.getElementById('customConfirmModal');
            if (customModal) {
                customModal.remove();
                if (onCancel) onCancel();
                document.removeEventListener('keydown', escHandler);
            }
        }
    };
    document.addEventListener('keydown', escHandler);
}
