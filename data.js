// ============================================================
//  여기만 수정하면 사이트 내용이 바뀝니다.
//  이미지는 img/pairs, img/gallery 폴더에 넣고 경로를 적어주세요.
//  이미지가 없으면 자동으로 빈 카드(플레이스홀더)가 보입니다.
// ============================================================

const SITE = {
  title: "PROMM",
  icon: "🎨",
};

// ------------------------------------------------------------
//  메인 페이지: 캐릭터 페어 8개
//  male / female 각각 이름과 프롬프트를 적어주세요.
// ------------------------------------------------------------
const PAIRS = [
  {
    id: "pair1",
    title: "페어 1",
    image: "img/pairs/pair1.jpg",
    male:   { name: "남캐 이름", prompt: "남자 캐릭터 프롬프트를 여기에 적어주세요." },
    female: { name: "여캐 이름", prompt: "여자 캐릭터 프롬프트를 여기에 적어주세요." },
  },
  {
    id: "pair2",
    title: "페어 2",
    image: "img/pairs/pair2.jpg",
    male:   { name: "남캐 이름", prompt: "남자 캐릭터 프롬프트" },
    female: { name: "여캐 이름", prompt: "여자 캐릭터 프롬프트" },
  },
  {
    id: "pair3",
    title: "페어 3",
    image: "img/pairs/pair3.jpg",
    male:   { name: "남캐 이름", prompt: "남자 캐릭터 프롬프트" },
    female: { name: "여캐 이름", prompt: "여자 캐릭터 프롬프트" },
  },
  {
    id: "pair4",
    title: "페어 4",
    image: "img/pairs/pair4.jpg",
    male:   { name: "남캐 이름", prompt: "남자 캐릭터 프롬프트" },
    female: { name: "여캐 이름", prompt: "여자 캐릭터 프롬프트" },
  },
  {
    id: "pair5",
    title: "페어 5",
    image: "img/pairs/pair5.jpg",
    male:   { name: "남캐 이름", prompt: "남자 캐릭터 프롬프트" },
    female: { name: "여캐 이름", prompt: "여자 캐릭터 프롬프트" },
  },
  {
    id: "pair6",
    title: "페어 6",
    image: "img/pairs/pair6.jpg",
    male:   { name: "남캐 이름", prompt: "남자 캐릭터 프롬프트" },
    female: { name: "여캐 이름", prompt: "여자 캐릭터 프롬프트" },
  },
  {
    id: "pair7",
    title: "페어 7",
    image: "img/pairs/pair7.jpg",
    male:   { name: "남캐 이름", prompt: "남자 캐릭터 프롬프트" },
    female: { name: "여캐 이름", prompt: "여자 캐릭터 프롬프트" },
  },
  {
    id: "pair8",
    title: "페어 8",
    image: "img/pairs/pair8.jpg",
    male:   { name: "남캐 이름", prompt: "남자 캐릭터 프롬프트" },
    female: { name: "여캐 이름", prompt: "여자 캐릭터 프롬프트" },
  },
];

// ------------------------------------------------------------
//  갤러리 페이지: 사진 목록
//  pair: 위 PAIRS 의 id 를 적으면 그 페어의 프롬프트가 팝업에 뜹니다.
//  사진마다 프롬프트가 다르면 male / female 을 직접 적어주세요 (pair 보다 우선).
// ------------------------------------------------------------
const GALLERY = [
  { image: "img/gallery/01.jpg", pair: "pair1", caption: "" },
  { image: "img/gallery/02.jpg", pair: "pair2", caption: "" },
  { image: "img/gallery/03.jpg", pair: "pair3", caption: "" },
  { image: "img/gallery/04.jpg", pair: "pair4", caption: "" },
  { image: "img/gallery/05.jpg", pair: "pair5", caption: "" },
  { image: "img/gallery/06.jpg", pair: "pair6", caption: "" },
  { image: "img/gallery/07.jpg", pair: "pair7", caption: "" },
  { image: "img/gallery/08.jpg", pair: "pair8", caption: "" },
  // 사진별로 프롬프트를 따로 쓰는 예시:
  // {
  //   image: "img/gallery/09.jpg",
  //   caption: "비 오는 날",
  //   male:   { name: "남캐", prompt: "..." },
  //   female: { name: "여캐", prompt: "..." },
  // },
];

// ------------------------------------------------------------
//  세계관 페이지
//  sections: 세계관 설명 블록 (body 는 줄바꿈 그대로 표시)
//  factions: 세력/소속 구도. members 에는 캐릭터 이름
//  relations: 캐릭터 관계 (from → to : label)
// ------------------------------------------------------------
const WORLD = {
  intro: "세계관 한 줄 소개를 적어주세요.",
  sections: [
    { icon: "🌍", title: "세계관 개요", body: "이 세계는 어떤 곳인지 적어주세요.\n시대, 배경, 분위기 등." },
    { icon: "📜", title: "역사", body: "주요 사건이나 역사를 적어주세요." },
    { icon: "✨", title: "규칙 / 설정", body: "마법, 기술, 사회 규칙 등 특별한 설정." },
  ],
  factions: [
    { name: "세력 A", color: "#e3d5f5", desc: "세력 설명", members: ["캐릭터1", "캐릭터2"] },
    { name: "세력 B", color: "#d3e5ef", desc: "세력 설명", members: ["캐릭터3", "캐릭터4"] },
    { name: "세력 C", color: "#fadec9", desc: "세력 설명", members: ["캐릭터5", "캐릭터6"] },
  ],
  relations: [
    { from: "캐릭터1", to: "캐릭터2", label: "연인" },
    { from: "캐릭터1", to: "캐릭터3", label: "라이벌" },
    { from: "캐릭터4", to: "캐릭터5", label: "소꿉친구" },
  ],
};
