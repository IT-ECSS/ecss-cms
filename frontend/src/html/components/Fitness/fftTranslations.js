/**
 * Translations for FFTParticipants form
 * Languages: English (en), Chinese (zh), Malay (ms)
 */
const fftTranslations = {
  // ── Header ──
  back: {
    en: 'Back',
    zh: '返回',
    ms: 'Kembali',
  },
  headerTitle: {
    en: 'ECSS Functional Fitness Test for Elderly',
    zh: '恩群社区服务乐龄体适能评估表',
    ms: 'Ujian Kecergasan Fungsional ECSS untuk Warga Emas',
  },
  selectLanguage: {
    en: 'Select Language',
    zh: '选择语言',
    ms: 'Pilih Bahasa',
  },

  // ── Pre-section ──
  preSectionHeading: {
    en: 'ECSS FFT Participants Form',
    zh: '恩群社区服务乐龄体适能评估表 — 参与者表格',
    ms: 'Borang Peserta FFT ECSS',
  },
  preSectionDesc: {
    en: 'Choose how you would like to fill in your information.',
    zh: '请选择您希望如何填写信息。',
    ms: 'Pilih cara anda ingin mengisi maklumat anda.',
  },
  singPassButtonText: {
    en: 'Retrieve Myinfo with',
    zh: '使用 Myinfo 检索',
    ms: 'Dapatkan Myinfo dengan',
  },
  manualButtonLine1: {
    en: 'Fill in the form manually',
    zh: '手动填写表格',
    ms: 'Isi borang secara manual',
  },

  // ── Registration Form ──
  registrationFormTitle: {
    en: 'Registration Form',
    zh: '登记表格',
    ms: 'Borang Pendaftaran',
  },
  registrationFormDescription: {
    en: 'Choose how you would like to fill in your information.',
    zh: '选择您希望如何填写信息。',
    ms: 'Pilih bagaimana anda ingin mengisi maklumat anda.',
  },
  registrationFormManual: {
    en: 'Fill In The Form Manually',
    zh: '手动填写表格',
    ms: 'Isi borang secara manual',
  },
  enterParticipantNumber: {
    en: 'Enter Participant Number',
    zh: '输入参与者编号',
    ms: 'Masukkan Nombor Peserta',
  },
  participantNumberTitle: {
    en: 'Participant Number',
    zh: '参与者编号',
    ms: 'Nombor Peserta',
  },
  participantNumberDesc: {
    en: "Enter your participant's number which was provided to you to continue.",
    zh: '请输入您的参与者编号以继续。',
    ms: 'Masukkan nombor peserta anda yang telah diberikan kepada anda untuk meneruskan.',
  },
  participantNumberPlaceholder: {
    en: 'Participant #',
    zh: '参与者编号',
    ms: 'No. Peserta',
  },
  searching: {
    en: 'Searching...',
    zh: '搜索中...',
    ms: 'Mencari...',
  },
  errorParticipantRequired: {
    en: 'Participant number is required.',
    zh: '请输入参与者编号。',
    ms: 'Nombor peserta diperlukan.',
  },
  errorParticipantDigitsOnly: {
    en: 'Participant number must contain digits only.',
    zh: '参与者编号只能包含数字。',
    ms: 'Nombor peserta mesti mengandungi digit sahaja.',
  },
  errorParticipantNotFound: {
    en: 'Participant not found. Please check the participant number.',
    zh: '找不到参与者，请检查参与者编号。',
    ms: 'Peserta tidak dijumpai. Sila semak nombor peserta.',
  },
  errorNotRegistered: {
    en: 'You have not registered for this FFT yet.\nPlease click on the back button to register.',
    zh: '您尚未注册此 FFT。\n请点击返回按钮进行注册。',
    ms: 'Anda belum mendaftar untuk FFT ini.\nSila klik butang kembali untuk mendaftar.',
  },
  errorAlreadyRegistered: {
    en: 'You have already registered for this FFT Event.',
    zh: '您已经注册了此 FFT 活动.',
    ms: 'Anda telah mendaftar untuk FFT ini.',
  },
  errorParticipantFetch: {
    en: 'Error retrieving participant data. Please try again.',
    zh: '获取参与者资料时出错，请重试。',
    ms: 'Ralat mendapatkan data peserta. Sila cuba lagi.',
  },
  errorEventDetails: {
    en: 'Failed to retrieve event details. Please try again.',
    zh: '无法获取活动详情，请重试。',
    ms: 'Gagal mendapatkan butiran acara. Sila cuba lagi.',
  },

  // ── Section 1: Particulars ──
  sectionParticulars: {
    en: ' Participant Particulars ',
    zh: '个人资料',
    ms: 'Butiran Peribadi',
  },
  labelName: {
    en: 'Full Name (NRIC) ',
    zh: '姓名 (NRIC)',
    ms: 'Nama (NRIC)',
  },
  placeholderName: {
    en: 'Enter your full name as per NRIC',
    zh: '请输入全名 (根据身份证)',
    ms: 'Masukkan nama penuh (mengikut Kad Pengenalan)',
  },
  labelDob: {
    en: 'Date of Birth (DD/MM/YYYY)',
    zh: '生日 (DD/MM/YYYY)',
    ms: 'Tarikh Lahir (DD/MM/YYYY)',
  },
  labelGender: {
    en: 'Gender',
    zh: '性别',
    ms: 'Jantina',
  },
  labelAge: {
    en: 'Age',
    zh: '年龄',
    ms: 'Umur',
  },
  placeholderAge: {
    en: 'Enter age',
    zh: '请输入年龄',
    ms: 'Masukkan umur',
  },
  labelPhone: {
    en: 'Phone No',
    zh: '电话',
    ms: 'No. Telefon',
  },
  labelContactNumber: {
    en: 'Contact Number',
    zh: '联系号码',
    ms: 'Nombor Hubungan',
  },
  placeholderPhone: {
    en: 'e.g. 91234567',
    zh: '例如 91234567',
    ms: 'cth. 91234567',
  },
  labelTestDate: {
    en: 'Test Date',
    zh: '检测日期',
    ms: 'Tarikh Ujian',
  },

  // ── Navigation ──
  previous: {
    en: 'Previous',
    zh: '上一步',
    ms: 'Sebelumnya',
  },
  next: {
    en: 'Next',
    zh: '下一步',
    ms: 'Seterusnya',
  },
  submit: {
    en: 'Submit',
    zh: '提交',
    ms: 'Hantar',
  },

  // ── Section 2: Health Declaration ──
  sectionHealth: {
    en: 'Health Declaration',
    zh: '健康申报',
    ms: 'Pengisytiharan Kesihatan',
  },
  healthQ1: {
    en: '1. You have been advised by a doctor not to exercise due to health reasons.',
    zh: '1. 因为您的健康因素，医生已建议您不要做任何运动。',
    ms: '1. Anda telah dinasihatkan oleh doktor untuk tidak bersenam atas sebab kesihatan.',
  },
  healthQ2: {
    en: '2. You have experienced heart pain (tightness, pressure, aching) during exercise.',
    zh: '2. 您曾在运动时发生过心绞痛（胸闷、压力、疼痛）。',
    ms: '2. Anda pernah mengalami sakit jantung (sesak, tekanan, sakit) semasa bersenam.',
  },
  healthQ3: {
    en: '3. You are experiencing pain in the joints, chest pain or giddiness now.',
    zh: '3. 您现在有关节疼痛、胸痛或晕眩。',
    ms: '3. Anda sedang mengalami sakit sendi, sakit dada atau pening sekarang.',
  },
  healthQ4: {
    en: '4. You have uncontrollable high blood pressure (≥160/100).',
    zh: '4. 您有无法控制的高血压问题 (160/100或以上)。',
    ms: '4. Anda mempunyai tekanan darah tinggi yang tidak terkawal (≥160/100).',
  },
  yes: {
    en: 'Yes',
    zh: '是',
    ms: 'Ya',
  },
  no: {
    en: 'No',
    zh: '否',
    ms: 'Tidak',
  },

  // ── Section 3: Programme Indemnity ──
  sectionIndemnity: {
    en: 'Indemnity Declaration',
    zh: '免责申明',
    ms: 'Pengisytiharan Indemniti',
  },
  indemnity1: {
    en: 'I voluntarily participate, and have been told the test objectives and possible physical discomfort and risks.',
    zh: '我是自愿参加，并被告知检测的目的和可能面临的身体不适与风险。',
    ms: 'Saya menyertai secara sukarela, dan telah dimaklumkan tentang objektif ujian dan kemungkinan ketidakselesaan fizikal dan risiko.',
  },
  indemnity2: {
    en: 'I agree to monitor my body condition, and agree to inform the tester and stop the test when I feel ill or have abnormal symptoms.',
    zh: '我同意在执行检测中监控自己的身体状况，也同意当我感到不舒服或有任何不寻常症状时，告知检测员并停止检测。',
    ms: 'Saya bersetuju untuk memantau keadaan badan saya, dan bersetuju untuk memberitahu penguji dan menghentikan ujian apabila saya berasa tidak sihat atau mempunyai gejala luar biasa.',
  },
  indemnity3: {
    en: 'I take full responsibility for any risks of illness and accidents that may arise from this test, and will not hold the organizer responsible.',
    zh: '我对于参与此检测可能造成身体不适、意外等风险，愿意自己承担完全的责任，对主办方不追究任何责任。',
    ms: 'Saya bertanggungjawab sepenuhnya atas sebarang risiko penyakit dan kemalangan yang mungkin timbul daripada ujian ini, dan tidak akan mempertanggungjawabkan penganjur.',
  },
  agreeTerms: {
    en: 'By checking this checkbox, I agree with the terms above.',
    zh: '勾选此复选框即表示我同意上述条款。',
    ms: 'Dengan menanda kotak ini, saya bersetuju dengan syarat-syarat di atas',
  },
  /*labelDate: {
    en: 'Date',
    zh: '日期',
    ms: 'Tarikh',
  },
  labelSignature: {
    en: 'Signature',
    zh: '签名',
    ms: 'Tandatangan',
  },
  signHere: {
    en: 'Sign here',
    zh: '请在此处签名',
    ms: 'Tandatangan di sini',
  },*/
  // ── Validation errors ──
  errNameRequired: {
    en: 'Please enter full name as per NRIC',
    zh: '请输入您的姓名 (根据身份证)',
    ms: 'Sila masukkan nama anda (mengikut Kad Pengenalan)',
  },
  errDobRequired: {
    en: 'Please enter a valid date of birth (dd/mm/yyyy)',
    zh: '请输入有效的出生日期 (dd/mm/yyyy)',
    ms: 'Sila masukkan tarikh lahir yang sah (dd/mm/yyyy)',
  },
  errGenderRequired: {
    en: 'Please select gender',
    zh: '请选择性别',
    ms: 'Sila pilih jantina',
  },
  errPhoneRequired: {
    en: 'Please enter contact number',
    zh: '请输入电话号码',
    ms: 'Sila masukkan nombor telefon',
  },
  errPhoneInvalidLength: {
    en: 'Contact number must be 8 digits long',
    zh: '电话号码必须是8位数字',
    ms: 'Nombor telefon mestilah 8 digit',
  },
  errPhoneInvalidStart: {
    en: 'Contact number must start with 0, 8 or 9',
    zh: '电话号码必须以0、8或9开头',
    ms: 'Nombor telefon mestilah bermula dengan 0, 8 atau 9',
  },
  errPhoneInvalidBoth: {
    en: 'Contact number must be 8 digits long and start with 0, 8 or 9',
    zh: '电话号码必须是8位数字且以0、8或9开头',
    ms: 'Nombor telefon mestilah 8 digit dan bermula dengan 0, 8 atau 9',
  },
  errTestDateRequired: {
    en: 'Please enter a valid test date (dd/mm/yyyy)',
    zh: '请输入有效的检测日期 (dd/mm/yyyy)',
    ms: 'Sila masukkan tarikh ujian yang sah (dd/mm/yyyy)',
  },
  errHealthRequired: {
    en: 'Please select Yes or No',
    zh: '请选择 是 或 否',
    ms: 'Sila pilih Ya atau Tidak',
  },
  errAgreeRequired: {
    en: 'You must agree to the terms',
    zh: '您必须同意条款',
    ms: 'Anda mesti bersetuju dengan syarat-syarat',
  },
  /*errDateRequired: {
    en: 'Please enter a valid date (dd/mm/yyyy)',
    zh: '请输入有效的日期 (dd/mm/yyyy)',
    ms: 'Sila masukkan tarikh yang sah (dd/mm/yyyy)',
  },
  errSignatureRequired: {
    en: 'Please provide your signature',
    zh: '请提供您的签名',
    ms: 'Sila berikan tandatangan anda',
  },*/

  // ── Success screen ──
  successQrTab: {
    en: 'QR Code',
    zh: '二维码',
    ms: 'Kod QR',
  },
  successStationsTab: {
    en: 'Test Stations',
    zh: '测试站',
    ms: 'Stesen Ujian',
  },
  successQrInstruction: {
    en: 'Please show this QR code to the station in-charge to scan',
    zh: '请向站点负责人出示此二维码以供扫描',
    ms: 'Sila tunjukkan kod QR ini kepada pegawai stesen untuk diimbas',
  },
  successEntry: {
    en: 'Participant Number',
    zh: '参与者编号',
    ms: 'Nombor Peserta',
  },
  successNoQr: {
    en: 'No QR code found. Please register to get your QR code.',
    zh: '未找到二维码。请注册以获取您的二维码。',
    ms: 'Kod QR tidak dijumpai. Sila daftar untuk mendapatkan kod QR anda.',
  },
  newRegistration: {
    en: 'New Registration',
    zh: '新注册',
    ms: 'Pendaftaran Baharu',
  },
  submitting: {
    en: 'Submitting...',
    zh: '提交中...',
    ms: 'Menghantar...',
  },

  // ── Success messages ──
  successTitle: {
    en: 'Participant Registration Completed!',
    zh: '参与者注册完成！',
    ms: 'Pendaftaran Peserta Selesai!',
  },
  successMessage: {
    en: 'Participant details have been successfully registered.',
    zh: '参与者资料已成功登记。',
    ms: 'Maklumat peserta telah berjaya didaftarkan.',
  },  
  // ── Station results ──
  station: {
    en: 'Station',
    zh: '站',
    ms: 'Stesen',
  },
  result: {
    en: 'Result',
    zh: '结果',
    ms: 'Keputusan',
  },
  attempt1: {
    en: 'Attempt 1',
    zh: '第一次',
    ms: 'Percubaan 1',
  },
  attempt2: {
    en: 'Attempt 2',
    zh: '第二次',
    ms: 'Percubaan 2',
  },
  improvementsRemarks: {
    en: 'Improvements & Remarks',
    zh: '改善与备注',
    ms: 'Penambahbaikan & Catatan',
  },
  improvements: {
    en: 'Improvements',
    zh: '改善',
    ms: 'Penambahbaikan',
  },
  remarks: {
    en: 'Remarks',
    zh: '备注',
    ms: 'Catatan',
  },

  // ── Personal info card ──
  labelDobShort: {
    en: 'DOB',
    zh: '生日',
    ms: 'Tarikh Lahir',
  },
  labelHeight: {
    en: 'Height',
    zh: '身高',
    ms: 'Tinggi',
  },
  labelWeight: {
    en: 'Weight',
    zh: '体重',
    ms: 'Berat',
  },
  labelBmi: {
    en: 'BMI',
    zh: 'BMI',
    ms: 'BMI',
  },
  // ── Station Configuration ──
  stations: [
    {
      id: 'measurement',
      num: '📏',
      title: 'Measurement Station',
      titleZh: '测量站',
      icon: 'fa-ruler-combined',
      color: '#8b5cf6',
      bg: '#f5f3ff',
      unit: '',
      fields: [
        { key: 'Height', label: 'Height (cm)', labelZh: '身高', type: 'number', placeholder: 'e.g. 160', unit: 'cm', columnName: 'Height' },
        { key: 'Weight', label: 'Weight (kg)', labelZh: '体重', type: 'number', placeholder: 'e.g. 60.5', unit: 'kg', columnName: 'Weight' },
        { key: 'BMI', label: 'BMI', labelZh: 'BMI', type: 'number', placeholder: 'e.g. 22.5', unit: '', columnName: 'BMI' },
      ],
    },
    {
      id: 'station1',
      num: 'Station 1',
      title: '30 sec Sit & Stand',
      titleZh: '30 秒坐立测验',
      icon: 'fa-chair',
      color: '#2563eb',
      bg: '#eff6ff',
      unit: '',
      fields: [
        { key: '30 secs Sit & Stand', label: 'Number Of Squats', labelZh: '次数', type: 'number', placeholder: 'e.g. 12', unit: '', columnName: '30 secs Sit & Stand' },
      ],
      remarksKey: 'Remarks',
      remarksColumnName: 'Remarks',
    },
    {
      id: 'station2',
      num: 'Station 2',
      title: '30 sec Arm Banding',
      titleZh: '30 秒手臂卷起',
      icon: 'fa-dumbbell',
      color: '#2563eb',
      bg: '#eff6ff',
      unit: '',
      fields: [
        { key: '30 secs Arm Banding', label: 'Number of Bicep Curls', labelZh: '次数', type: 'number', placeholder: 'e.g. 15', unit: '', columnName: '30 secs Arm Banding' },
      ],
      remarksKey: 'Remarks',
      remarksColumnName: 'Remarks',
    },
    {
      id: 'station3',
      num: 'Station 3',
      title: '2 min On-the-spot Marching',
      titleZh: '2 分钟抬膝测验',
      icon: 'fa-walking',
      color: '#2563eb',
      bg: '#eff6ff',
      unit: '',
      note: '(1 set = One right & left step)',
      fields: [
        { key: '2 min On-the-spot Marching', label: 'Sets of steps', labelZh: '步数', type: 'number', placeholder: 'e.g. 80', unit: '', columnName: '2 min On-the-spot Marching' },
      ],
      remarksKey: 'Remarks',
      remarksColumnName: 'Remarks',
    },
    {
      id: 'station4',
      num: 'Station 4',
      title: 'Sit & Reach',
      titleZh: '坐椅体前弯',
      icon: 'fa-arrows-alt-h',
      color: '#2563eb',
      bg: '#eff6ff',
      unit: 'cm',
      fields: [
        { key: 'Sit & Reach', label: 'Result (cm)', labelZh: '成绩', type: 'number', placeholder: 'e.g. 5', required: true, unit: 'cm', columnName: 'Sit & Reach' },
      ],
      resultKey: 'Sit & Reach',
      note: '左 L / 右 R (直腿 Straight leg)',
      remarksKey: 'Remarks',
      remarksColumnName: 'Remarks',
    },
    {
      id: 'station5',
      num: 'Station 5',
      title: 'Back Stretching',
      titleZh: '抓背测验',
      icon: 'fa-hand-paper',
      color: '#2563eb',
      bg: '#eff6ff',
      unit: 'cm',
      fields: [
        { key: 'Back Stretching', label: 'Result (cm)', labelZh: '成绩', type: 'number', placeholder: 'e.g. -2', required: true, unit: 'cm', columnName: 'Back Stretching' },
      ],
      resultKey: 'Back Stretching',
      note: '左 L / 右 R (上面 Hand on top)',
      remarksKey: 'Remarks',
      remarksColumnName: 'Remarks',
    },
    {
      id: 'station6',
      num: 'Station 6',
      title: '2.44m Speed Walk',
      titleZh: '2.44 公尺起身绕物测验',
      icon: 'fa-stopwatch',
      color: '#2563eb',
      bg: '#eff6ff',
      unit: 'sec',
      fields: [
        { key: '2.44m Speed Walk', label: 'Result (sec)', labelZh: '成绩（秒）', type: 'number', placeholder: 'e.g. 5.2', required: true, unit: 'sec', columnName: '2.44m Speed Walk' },
      ],
      resultKey: '2.44m Speed Walk',
      remarksKey: 'Remarks',
      remarksColumnName: 'Remarks',
    },
    {
      id: 'station7',
      num: 'Station 7',
      title: 'Grip test',
      titleZh: '握力测试',
      icon: 'fa-fist-raised',
      color: '#2563eb',
      bg: '#eff6ff',
      unit: 'kg',
      fields: [
        { key: 'Grip test', label: 'Result (kg)', labelZh: '成绩', type: 'number', placeholder: 'e.g. 25', required: true, unit: 'kg', columnName: 'Grip test' },
      ],
      resultKey: 'Grip test',
      note: '左 L / 右 R (手 Hand)',
      remarksKey: 'Remarks',
      remarksColumnName: 'Remarks',
    },
  ],
  // ── Home Confirm Modal ──
  homeModalTitle: {
    en: 'Go to Home',
    zh: '返回主页',
    ms: 'Pergi ke Laman Utama',
  },
  homeModalDesc: {
    en: 'Do you want to clear your saved details?',
    zh: '您想清除已保存的资料吗？',
    ms: 'Adakah anda ingin memadam maklumat yang telah disimpan?',
  },
  homeModalYes: {
    en: 'Leave',
    zh: '离开',
    ms: 'Keluar',
  },
  homeModalNo: {
    en: 'Stay',
    zh: '留下',
    ms: 'Kekal',
  },

  // ── Station Selection ──
  selectStation: {
    en: 'Select Station',
    zh: '选择工作站',
    ms: 'Pilih Stesen',
  },
  selectStationDesc: {
    en: 'Please select your station to continue.',
    zh: '请选择您的工作站以继续。',
    ms: 'Sila pilih stesen anda untuk meneruskan.',
  },

  // ── Time Slot Selection ──
  selectTimeSlot: {
    en: 'Select A Time Slot',
    zh: '选择时间段',
    ms: 'Pilih Slot Masa',
  },
  selectTimeSlotDesc: {
    en: 'Please select a time slot to continue.',
    zh: '请选择一个时间段继续。',
    ms: 'Sila pilih slot masa untuk meneruskan.',
  },
  timeSlotLabel: {
    en: 'Time Slot',
    zh: '时间段',
    ms: 'Slot Masa',
  },
  noTimeSlots: {
    en: 'No time slots available for this event.',
    zh: '此活动没有可用的时间段。',
    ms: 'Tiada slot masa tersedia untuk acara ini.',
  },
  slotStatsLoading: {
    en: 'Loading slot availability...',
    zh: '正在加载时间段可用名额...',
    ms: 'Memuatkan ketersediaan slot...',
  },
  slotMaxLabel: {
    en: 'Max',
    zh: '上限',
    ms: 'Maksimum',
  },
  slotRegisteredLabel: {
    en: 'Registered',
    zh: '已报名',
    ms: 'Berdaftar',
  },
  slotStatusLabel: {
    en: 'Status',
    zh: '状态',
    ms: 'Status',
  },
  slotStatusFull: {
    en: 'Full',
    zh: '已满',
    ms: 'Penuh',
  },
  slotStatusOpen: {
    en: 'Open',
    zh: '开放',
    ms: 'Terbuka',
  },
  slotStatusUpdating: {
    en: 'Loading...',
    zh: '加载中...',
    ms: 'Memuatkan...',
  },
  slotLeftSuffix: {
    en: 'slots left',
    zh: '个名额剩余',
    ms: 'slot berbaki',
  },
  slotFullModalTitle: {
    en: 'This Slot Is Full',
    zh: '此时间段已满',
    ms: 'Slot Ini Penuh',
  },
  slotFullModalDesc: {
    en: 'Do you want to proceed anyway?',
    zh: '您仍要继续吗？',
    ms: 'Adakah anda mahu teruskan?',
  },
  slotFullModalYes: {
    en: 'Yes, Proceed',
    zh: '是，继续',
    ms: 'Ya, Teruskan',
  },
  slotFullModalNo: {
    en: 'No, Stay Here',
    zh: '不，留在此页',
    ms: 'Tidak, Kekal Di Sini',
  },
  headerDesc: {
    en: 'Click on a badge below to re-select your language, event or time slot',
    zh: '点击下方标签可重新选择语言、活动或时间段',
    ms: 'Klik pada label di bawah untuk memilih semula bahasa, acara atau slot masa',
  },
  headerDescWithSlot: {
    en: 'Click on a badge below to re-select your language, event or time slot',
    zh: '点击下方标签可重新选择语言、活动或时间段',
    ms: 'Klik pada label di bawah untuk memilih semula bahasa, acara atau slot masa',
  },
  headerDescLanguageOnly: {
    en: 'Click on a badge below to re-select your language',
    zh: '点击下方标签可重新选择语言',
    ms: 'Klik pada label di bawah untuk memilih semula bahasa',
  },
  headerDescLanguageEvent: {
    en: 'Click on a badge below to re-select your language or event',
    zh: '点击下方标签可重新选择语言或活动',
    ms: 'Klik pada label di bawah untuk memilih semula bahasa atau acara',
  },
  participantRegistration: {
    en: 'Participant Registration',
    zh: '参与者注册',
    ms: 'Pendaftaran Peserta',
  },
  registrationMethodDesc: {
    en: 'Select a registration method to register participants for this event.',
    zh: '请选择注册方式来为此活动注册参与者。',
    ms: 'Pilih kaedah pendaftaran untuk mendaftarkan peserta bagi acara ini.',
  },
  bulkRegistration: {
    en: 'Bulk Registration',
    zh: '批量注册',
    ms: 'Pendaftaran Pukal',
  },
  individualRegistration: {
    en: 'Individual Registration',
    zh: '个人注册',
    ms: 'Pendaftaran Individu',
  },
};

export default fftTranslations;
