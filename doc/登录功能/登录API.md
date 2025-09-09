首先需要打开: https://seller.kuajingmaihuo.com/login

等待用户登录

用户登录后页面会跳转到: https://seller.kuajingmaihuo.com/settle/site-main

此时表示我们初步获取到了用户的核心Cookie



Cookie存在浏览器缓存,你可以获取到 注意此时我们不能根据名称获取 我希望能全部获取到
_a42	dc29453b-2a9c-49d1-8381-e3edc349562e	.kuajingmaihuo.com	/	2026-09-09T10:48:36.853Z	40	✓	✓	None			Medium
_bee	hHjvXMTJiAyElsMjm7yP0wmHwx3zdamW	.kuajingmaihuo.com	/	2026-09-09T10:48:36.853Z	36	✓	✓	None			Medium
_f77	b53ea001-c67a-4f85-963c-b3684eae2e59	.kuajingmaihuo.com	/	2026-09-09T10:48:36.853Z	40	✓	✓	None			Medium
_nano_fp	Xpmynq9yX5mJXpTJX9_~ATThIOggwp4m5cFCM_cY	seller.kuajingmaihuo.com	/	2026-09-05T06:13:01.000Z	48		✓				Medium
api_uid	CmeSWmi6f2wuLgBREahEAg==	.kuajingmaihuo.com	/	2026-09-05T06:13:00.194Z	31		✓				Medium
rckk	hHjvXMTJiAyElsMjm7yP0wmHwx3zdamW	.kuajingmaihuo.com	/	2026-09-09T10:48:36.854Z	36	✓	✓				Medium
ru1k	b53ea001-c67a-4f85-963c-b3684eae2e59	.kuajingmaihuo.com	/	2026-09-09T10:48:36.854Z	40	✓	✓				Medium
ru2k	dc29453b-2a9c-49d1-8381-e3edc349562e	.kuajingmaihuo.com	/	2026-09-09T10:48:36.854Z	40	✓	✓				Medium
SUB_PASS_ID	eyJ0IjoidXN6NnlUOVFNNm5kczZ5MnBHQllmWFNnODlSUjRpK01ya0k5djR1MGx6cTd4bWd2NjVwMWdYNEI0UkdKdU5CTyIsInYiOjEsInMiOjEwMDAwLCJ1IjoyNDQ2NDk0MTYwMjkyMn0=	seller.kuajingmaihuo.com	/	2025-09-10T10:47:36.325Z	155	✓	✓				Medium


拿到Cookie后你先打印在控制台,我们后面要用这个Cookie完成获取用户信息的API 这个稍后执行


你需要知道的是目前我们登录的是公共的站点 TEMU是有多个区域站点的 需要从此站点跳转

目前我们先完成公共站点的基本登录 及 用户信息的获取


请求
curl -X POST 'https://seller.kuajingmaihuo.com/bg/quiet/api/mms/userInfo' -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' -H 'Accept-Encoding: gzip, deflate, br, zstd' -H 'Content-Type: application/json' -H 'cache-control: max-age=0' -H 'anti-content: 0aqWtxUkM_VelxjuVXS6ye12KoyUtGpVMfHCCJ5jtquj4GirlXgHnqNilYgYfYpCXJFPsqV_g-tdI1Ru7ktI53wQnRRG0v-OqVjhppyGnu7Hsoz8s6zq98futF2-BXKY7nLLr4Dc3S0wNreJl0vY24fdvJlYpjld6vlYvJldwqlYnJn0wYn9ZKufheMriq77t-k7uZwFWRmE37kF3QKmL1SKG9_S1MEF-iWHQ9EKM2KKBAVHw9vn0QxzIVanisvu4aKqgFldyJqY5Y_lYv8jYn8vi0aiVUxiAs_qnSnd-zadyJQYcAvunbKqOiljduy9_K9VVH257Mt_k-wXwyDgw73-EMs-1v_1H-WgwvZEZB7NE7QfpgkSor1LWvstHMMq7rQoo6tF_jgI3qV_U4vuPXdnPn7p0US1VD638DD1_Mz-PIFQa73tMDbQImm8I3F8OebvPCmAcyX092Ep1pRrC2bswP' -H 'sec-ch-ua-platform: "Windows"' -H 'sec-ch-ua: "Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"' -H 'sec-ch-ua-mobile: ?0' -H 'origin: https://seller.kuajingmaihuo.com' -H 'sec-fetch-site: same-origin' -H 'sec-fetch-mode: cors' -H 'sec-fetch-dest: empty' -H 'referer: https://seller.kuajingmaihuo.com/settle/site-main?redirectUrl=https%3A%2F%2Fseller.kuajingmaihuo.com%2F' -H 'accept-language: zh-CN,zh;q=0.9,en-US;q=0.8,en-GB;q=0.7,en;q=0.6' -H 'priority: u=1, i' -H 'Cookie: api_uid=CmeSWmi6f2wuLgBREahEAg==; _nano_fp=Xpmynq9yX5mJXpTJX9_~ATThIOggwp4m5cFCM_cY; _bee=hHjvXMTJiAyElsMjm7yP0wmHwx3zdamW; _f77=b53ea001-c67a-4f85-963c-b3684eae2e59; _a42=dc29453b-2a9c-49d1-8381-e3edc349562e; rckk=hHjvXMTJiAyElsMjm7yP0wmHwx3zdamW; ru1k=b53ea001-c67a-4f85-963c-b3684eae2e59; ru2k=dc29453b-2a9c-49d1-8381-e3edc349562e; SUB_PASS_ID=eyJ0IjoiOEdzWFQ1UERZaC9LaGlQV1AwZE5IS2t3RnEwdXhSRFBLdE1SOUVHOXNnem9jcnVsZnhqVFNBaDZkMktmMm1WdSIsInYiOjEsInMiOjEwMDAwLCJ1IjoyNDQ2NDk0MTYwMjkyMn0=' -d '{}' --http2

响应
{
  "success": true,
  "errorCode": 1000000,
  "errorMsg": null,
  "result": {
    "userId": 24464941602922,
    "maskMobile": "+86 130****5118",
    "maskOwnerMobile": "5118",
    "accountType": 1,
    "accountStatus": 1,
    "tokenType": 1,
    "companyList": [
      {
        "companyName": "-",
        "malInfoList": [
          {
            "mallId": 634418224869329,
            "mallName": "HAPPY JAM",
            "logo": "https://img.cdnfe.com/supplier-public-tag/2079f610b3/b75ab6eb-85f2-488d-b2dd-e10055c3bab5_300x300.jpeg",
            "mallStatus": 1,
            "isSemiManagedMall": false
          }
        ]
      }
    ],
    "nickName": null,
    "roleNameList": [
      "主账号"
    ]
  }
}

我们还需要在  https://seller.kuajingmaihuo.com/settle/site-main 登陆后 等待用户选择站点区域

用户选择后 会跳转到: https://agentseller.temu.com/main/authentication?redirectUrl=https%3A%2F%2Fagentseller.temu.com&mallId=634418224869329&asCode=1TbAjW1AKc9LGjQx3oBt1992e370e8316403027586a127fc7fd2b0744fa9f1d00ea4e7f0b0e

此时我们需要再次获取 https://agentseller.temu.com 页面的Cookie 注意和刚刚之前获取的一样 需要全量获取

本次获取的Cookie将作为功能性的Cookie调用