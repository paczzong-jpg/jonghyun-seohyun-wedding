export const weddingData = {
  // 기본 정보
  title: "박종현, 서현 결혼합니다.",
  ogTitle: "박종현, 서현 결혼합니다.",
  ogDescription: "2026년 10월 10일 토요일",
  ogImage: "/images/1_thumbnail.jpg",
  shareUrl: "https://peeeeeach.com/sample/mb1/",

  // 날짜 및 장소
  date: "2026년 10월 10일 토요일 오후 12시 30분",
  venue: "Hidden Bay Hotel",
  address: "서울시 마포구 서교동 123-12",

  // 신랑 신부 정보
  groom: {
    label: "Groom",
    name: "Park Jong Hyun",
  },
  bride: {
    label: "Bride",
    name: "Seo Hyun",
  },

  // 유튜브 영상
  video: {
    youtubeId: "NucA7kgE1W8",
    thumbnailUrl: "https://img.youtube.com/vi/NucA7kgE1W8/maxresdefault.jpg",
  },

  // 지도 정보
  map: {
    lat: 37.554510,
    lng: 126.909252,
    markerUrl: "https://jeajinwow.mycafe24.com/map_pin/pin_pink.png",
    venueName: "웨딩피치홀",
    address: "서울시 마포구 서교동 123-12",
    transport: {
      subway: {
        title: "🚃 지하철",
        info: "2호선 홍대입구역 하차\n5번출구에서 전방 직진 300M\n4번출구(뒷쪽) 셔틀버스 5분 단위 운행",
      },
      bus: {
        title: "🚌 버스",
        info: "홍대입구역 정류장 하차 후\n도보 5분",
      },
    },
  },

  // 계좌번호
  accounts: {
    groom: {
      title: "🤵🏻‍♂️ 신랑 측 계좌번호",
      list: [
        { bank: "카카오뱅크", number: "123-12-12345", name: "신랑" },
        { bank: "카카오뱅크", number: "123-12-12345", name: "신랑부" },
        { bank: "카카오뱅크", number: "123-12-12345", name: "신랑모" },
      ],
    },
    bride: {
      title: "👰🏻‍♀️ 신부 측 계좌번호",
      list: [
        { bank: "카카오뱅크", number: "123-12-12345", name: "신부" },
        { bank: "카카오뱅크", number: "123-12-12345", name: "신부부" },
        { bank: "카카오뱅크", number: "123-12-12345", name: "신부모" },
      ],
    },
  },

  // 이미지 경로
  images: {
    main1: "/images/gallery_1.jpg",
    saveTheDate: "/images/3_savethedate.jpg",
    envelope: "/images/4_envelope.png",
    handwrite: "/images/5_handwrite.jpg",
    main2: "/images/6_main2.png",
    groomFamily: "/images/7_groom_fam.jpg",
    brideFamily: "/images/8_bride_fam.jpg",
    loveLetter1: "/images/loveletter_film.png",
    loveLetter2: "/images/loveletter_film.png",
    calendar: "/images/11_calendar.jpg",
    mapTitle: "/images/12_map.jpg",
    accountTitle: "/images/13_bank.jpg",
    gallery: [
      "/images/gallery_1.jpg",
      "/images/gallery_2.jpg",
      "/images/gallery_3.jpg",
      "/images/gallery_4.jpg",
      "/images/gallery_5.jpg",
    ],
  },

  // BGM (선택사항)
  bgm: {
    enabled: false,
    url: "",
  },
};
