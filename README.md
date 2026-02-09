# Woody Service Front

레슨 예약 시스템 프론트엔드입니다.  
학생은 시간표에서 예약을 신청/취소하고, 선생님은 예약 확정/취소 및 학생 관리를 할 수 있습니다.

## 주요 기능

- 주간/월간 캘린더 보기 전환
- 시간 슬롯 기반 예약 관리 (10:00 ~ 23:00)
- 학생 예약 신청/취소
- 선생님 로그인 후 예약 확정/취소
- 선생님 비밀번호 변경 (4자리 이상)
- 학생 등록/삭제 관리
- 지난 시간 예약 차단

## 사용자 사용 방법

### 학생

1. 우측 상단 입력창에 등록된 학생 이름을 입력합니다.
2. `주간`/`월간` 버튼으로 보기 모드를 전환합니다.
3. 예약하려는 시간 칸을 클릭해 신청합니다.
4. 본인이 신청한 같은 칸을 다시 클릭하면 취소할 수 있습니다.

참고:
- 학생은 본인 이름으로 등록된 예약만 보입니다.
- 이미 확정된 시간, 지난 시간은 신청할 수 없습니다.
- 실제 신청/취소 동작은 주간 보기에서 시간 칸 클릭으로 진행됩니다.

### 선생님

1. 우측 상단 `선생님` 버튼으로 로그인합니다.
2. 예약 항목을 클릭해 상태를 변경합니다.
3. 설정 메뉴에서 비밀번호 변경, 학생 관리(추가/삭제)를 수행합니다.

예약 클릭 동작:
- `pending` 상태: 확정 처리
- `confirmed` 상태: 예약 취소(삭제)

## 개발 실행 방법

### 1) 설치

```bash
npm install
```

### 2) 개발 서버 실행

```bash
npm start
```

실행 후 브라우저에서 `http://localhost:3000` 접속

## 백엔드 연동

프론트엔드는 아래 기준으로 API를 호출합니다.

- API Base: `/api/reservation`
- 개발 환경 프록시: `src/setupProxy.js`
- 프록시 대상 기본값: `http://127.0.0.1:8080`
- 프록시 대상 변경 환경변수: `REACT_APP_API_TARGET`

PowerShell 예시:

```powershell
$env:REACT_APP_API_TARGET="http://127.0.0.1:8080"
npm start
```

### 프론트엔드에서 사용하는 API 목록

- `GET /api/reservation/schedules`
- `POST /api/reservation/schedules`
- `DELETE /api/reservation/schedules/:id`
- `POST /api/reservation/schedules/:id/confirm`
- `GET /api/reservation/students`
- `POST /api/reservation/students`
- `DELETE /api/reservation/students/:id`
- `POST /api/reservation/login`
- `POST /api/reservation/password`

## 빌드/배포

```bash
npm run build
```

- 빌드 산출물: `build/`
- `package.json`의 `homepage` 값이 `/reservation`으로 설정되어 있어, 정적 파일 경로가 해당 베이스 경로 기준으로 생성됩니다.
- 운영 환경에서는 프론트 경로(`/reservation`)와 API 경로(`/api/reservation`)를 라우팅/리버스 프록시로 맞춰주세요.

## 프로젝트 구조

```text
src/
  App.js          # 예약 UI 및 사용자 동작 로직
  setupProxy.js   # 개발 환경 API 프록시 설정
public/
  index.html      # Tailwind CDN 포함 템플릿
```
