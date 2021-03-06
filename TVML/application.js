var dom;
var test = {};
var videoTest = {};
var nowPlayer = null;
var userData = {};
var window = this;

/*
* 我的 动漫订阅
* https://space.bilibili.com/ajax/Bangumi/getList?mid=902845
*
* 我的 我的订阅(旧版)
* https://api.bilibili.com/x/web-feed/feed?ps=10&pn=2&type=0
*
* 空间 用户收藏夹
* https://api.bilibili.com/x/v2/fav/folder?vmid=11336264&jsonp=jsonp&callback=_jsonp7w97f2ymphi
*
* 空间 用户首页版块
* https://api.bilibili.com/x/space/channel/index?mid=11336264&guest=false&jsonp=jsonp&callback=_jsonpx036tchreuc
*
* 空间 个人资料 验证 Referer 必须为POST mid=11336264
* https://space.bilibili.com/ajax/member/GetInfo
*
* 空间 个人资料 无需验证referee
* https://api.bilibili.com/cardrich?mid=11336264
*
* 空间 投稿数 和 关注信息
* https://api.bilibili.com/vipinfo/default?mid=11336264&loginid=902845
*
* 空间 最近投稿
* https://space.bilibili.com/ajax/member/getSubmitVideos?mid=11336264&page=1&pagesize=25
*
* 空间 获取用户公告
* https://space.bilibili.com/ajax/settings/getNotice?mid=11336264
*
* 空间 获取用户标签
* https://space.bilibili.com/ajax/member/getTags?mids=11336264
*
* 空间 置顶视频
* https://space.bilibili.com/ajax/top/showTop?mid=11336264&guest=1
*
* 番剧 更多推荐
* https://bangumi.bilibili.com/web_api/season/recommend/6465.json
*
* 番剧 番剧详情
* https://bangumi.bilibili.com/jsonp/seasoninfo/6465.ver?callback=seasonListCallback&jsonp=jsonp&_=1511089954345
*
* 番剧 承包7日榜
* https://bangumi.bilibili.com/sponsor/rankweb/get_sponsor_week_list?season_id=6308&pagesize=7
*
* 番剧 相关视频
* https://api.bilibili.com/x/web-interface/tag/top?pn=1&ps=30&callback=relate_video_callback&jsonp=jsonp&tid=4641922&_=1511098218419
* */

var displayErrorLock = false;

// 显示错误信息
function displayError(title="", info="") {
    console.warn("displayError",title, info);
    if(displayErrorLock){
        console.warn("不报错窗口递归");
        return;
    }
    displayErrorLock = true;
    let xml = `<document>
   <descriptiveAlertTemplate>
      <title>${title}</title>
      <description>${info}</description>
      <row>
         <button id="cancel">
            <text>关闭</text>
         </button>
         <button id="reload">
            <text>重载应用</text>
         </button>
      </row>
   </descriptiveAlertTemplate>
</document>`;
    let parser = new DOMParser();
    let parsed = parser.parseFromString(xml.replace(new RegExp('&', 'g'), '&amp;'), "application/xml");
    parsed.getElementById("cancel").addEventListener("select",function (e) {
        navigationDocument.dismissModal();
    });
    parsed.getElementById("reload").addEventListener("select",function (e) {
        App.reload({});
    });
    // parsed.addEventListener("play",function (e) {
    //     // 显示详细错误信息
    //     // navigationDocument.dismissModal();
    // });
    navigationDocument.presentModal(parsed);
    displayErrorLock = false;
}

function Alert(title="", info="") {
    let xml = `<document>
   <descriptiveAlertTemplate>
      <title>${title}</title>
      <description>${info}</description>
      <row>
         <button id="ok">
            <text>好</text>
         </button>
      </row>
   </descriptiveAlertTemplate>
</document>`;
    let parser = new DOMParser();
    let parsed = parser.parseFromString(xml.replace(new RegExp('&', 'g'), '&amp;'), "application/xml");
    parsed.getElementById("ok").addEventListener("select",function (e) {
        navigationDocument.dismissModal();
    });
    navigationDocument.presentModal(parsed);
}

// json解析错误拦截
function jsonParse(s) {
    var data = {};
    try{
        var data = JSON.parse(s);
    }catch(exception) {
        displayError("JSON解析错误",s);
    }
    return data;
}

function myHome(setDocument) {
    setDocument(tvOS.template.loading("加载中个人信息.."));
    ajax.get('https://api.bilibili.com/x/web-interface/nav',function (data) {
        console.warn(data);
        data = jsonParse(data);
        var myhome;
        if(data.code != 0){
            myhome = new tvOS.template.compilation('个人中心','尚未登录',data.message,'https://static.hdslb.com/images/akari.jpg',[
                // new tvOS.element.buttonLockup('登录','resource://button-add')
            ],[
                new tvOS.element.listItemLockup(1,'登录','二维码',function () {
                    openLogin(function (s) {
                        if(s){
                            myHome(setDocument);
                        }
                    });
                })
            ]);
        }else{
            userData = data.data;
            console.warn(data);
            var name =userData.uname;
            if(userData.vipStatus){
                name +=` <badge src="https://static.hdslb.com/images/base/vip-16-icon.png" width='32' height='32' alt="大会员" accessibility="" /> `
            }
            myhome = new tvOS.template.compilation('个人中心',name,'',userData.face,[
                // new tvOS.element.buttonLockup('登录','resource://button-add')
            ],[
                new tvOS.element.listItemLockup(0,'动态','',function () {
                    openDynamic();
                }),
                new tvOS.element.listItemLockup(0,'收藏夹','',function () {}),
                new tvOS.element.listItemLockup(0,'历史','',function () {}),
                new tvOS.element.listItemLockup(0,'我的首页','',function () {
                    openUser(userData.mid);
                }),
                new tvOS.element.listItemLockup(0,'退出登录','',function () {
                    ajax.get('https://account.bilibili.com/login?act=exit',function () {
                        //持久化UserCookie;
                        window.saveUserCookie&&saveUserCookie();
                        myHome(setDocument);
                    })
                }),
            ]);
            //myhome.customHeaderInAfter=`<badge src="https://static.hdslb.com/images/base/vip-16-icon.png" width='32' height='32'/>`;
            myhome.headerRow = [];
            myhome.headerRow.push(` Lv${userData.level_info.current_level} `);
            myhome.headerRow.push(` 硬币:${userData.money} `);
            myhome.headerRow.push(` B币:${userData.wallet.bcoin_balance} `);
        }

        // navigationDocument.replaceDocument(myhome.view,loadingBox.view);
        // myhome.display();
        setDocument(myhome);
    });
    /**/
    // return loadingBox;
}
function timeline(setDocument) {
    setDocument(tvOS.template.loading("加载番剧信息..."));
    ajax.get('https://bangumi.bilibili.com/web_api/timeline_global',function (data) {
        data = jsonParse(data);
        console.log(data);
        var tilelineData = data.result;
        var listView = tvOS.template.custom('');
        var dayShelf = "";
        var week = [
            '',
            "周一",
            "周二",
            "周三",
            "周四",
            "周五",
            "周六",
            "周日",
        ];


        tilelineData.forEach(function (day) {
            dayShelf+=`<shelf ${day.is_today?"autoHighlight='autoHighlight'":''} id="day-${day.date}">
             <header><title>${day.is_today?"今天":day.date} ${week[day.day_of_week]}</title></header>
             <prototypes>
                <lockup binding="@autoHighlight:{autoHighlight};" prototype="bangumi">
                    <img binding="@src:{cover};" width="200" height="300"/>
                    <title binding="textContent:{title};" />
                    <description  binding="textContent:{description};" style="font-size: 30;color:#fff" />
                </lockup>
                <lockup binding="@autoHighlight:{autoHighlight};" prototype="bangumi_published">
                    <img binding="@src:{cover};" width="200" height="300"/>
                    <title binding="textContent:{title};" style="color:#fb7299" />
                    <description  binding="textContent:{description};" style="font-size: 30;color:#fff" />
                </lockup>
                <lockup binding="@autoHighlight:{autoHighlight};" prototype="bangumi_delay">
                    <img binding="@src:{cover};" width="200" height="300"/>
                    <title binding="textContent:{title};" />
                    <description  binding="textContent:{description};" style="font-size: 30;color:#fff" />
                </lockup>
            </prototypes>
            <section binding="items:{timeline};" />
         </shelf>`
        });

        listView.xml = `<document>
   <stackTemplate>
      <banner>
         <title>番剧</title>
      </banner>
      <collectionList>
         ${dayShelf}
      </collectionList>
   </stackTemplate>
</document>
`;

        var view = listView.view;

        tilelineData.forEach(function (day) {
            let shelf = view.getElementById("day-"+day.date);
            let section = shelf.getElementsByTagName("section").item(0);
            section.dataItem = new DataItem()
            var index = 0;
            let newItems = day.seasons.map((result) => {
                var type = "bangumi";
                if(result.delay){
                    type = "bangumi_delay"
                }
                if(result.is_published){
                    type = "bangumi_published"
                }
                let objectItem = new DataItem(type, result.season_id);
                objectItem.cover = result.cover;
                objectItem.title = result.title;
                if(result.delay){
                    objectItem.title = "[本周停更] "+ result.title;
                }
                objectItem.pub_index = result.pub_index;
                objectItem.pub_time = result.pub_time;
                objectItem.autoHighlight = false;
                if(day.is_today && index==0){
                    objectItem.autoHighlight = 'autoHighlight';
                }

                objectItem.description = `${result.pub_index} ${result.pub_time}`;

                objectItem.onselect = function (e) {
                    openBangumi(result.season_id);
                };
                index++;
                return objectItem;
            });
            section.dataItem.setPropertyPath("timeline", newItems);

        });
        // console.log('view',view.getElementsByTagName("shelf").item(6));
        // view.getElementsByTagName("shelf").item(6).attributes.item().autoHighlight = true;
        // view.getElementsByTagName("shelf").item(6).getElementsByTagName("lockup").item(0).attributes.item().autoHighlight = true;
        test.bb = view;
        setDocument(listView);
    });
}
function openSearchView(setDocument) {
    var page = tvOS.template.custom(`<document>
   <searchTemplate>
      <searchField keyboardTraits="alphanumeric" id="searchBox">在这里输入你想寻找的视频</searchField>
        <button id="searchBtn">
                <text>搜索</text>
        </button>
      <shelf>
         <header>
            <title>热搜</title>
         </header>
         <section>
            <lockup id="test_bangumi_Play">
               <img src="path to images on your server/Car_Movie_250x375_A.png" width="182" height="274" />
               <title>一个测试番剧</title>
            </lockup>
            <lockup id="test_video_Play">
               <img src="path to images on your server/Car_Movie_250x375_B.png" width="182" height="274" />
               <title>一个测试视频</title>
            </lockup>
            <lockup>
               <img src="path to images on your server/Car_Movie_250x375_C.png" width="182" height="274" />
               <title>不知道放什么</title>
            </lockup>
         </section>
      </shelf>
   </searchTemplate>
</document>`);
    setDocument(page); 
    
    var searchField = page.view.getElementById("searchBox");
    var keyboard = searchField.getFeature("Keyboard");
    var searchText = "";
 
    keyboard.onTextChange = function() {
            searchText = keyboard.text;
            console.log("Search text changed " + searchText);
    }
    
    page.view.getElementById("searchBtn").addEventListener("select",function (e) {
        if(searchText != "")
        {
            searchResults(page, searchText);
        }
    });
}

function searchResults(doc, s_keyword)
{
    openVideo(s_keyword, null, true);
}

function openLogin(callback=function () {}) {
    ajax.get("https://passport.bilibili.com/qrcode/getLoginUrl",function (data) {
        data = jsonParse(data);
        data = data.data;
        var oauthKey = data.oauthKey;

        console.warn(data);
        var getinfo = function () {
            console.log(oauthKey);
            ajax.post('https://passport.bilibili.com/qrcode/getLoginInfo',{
                oauthKey:oauthKey,
                gourl:"https://www.bilibili.com/",
            },function (data) {
                console.warn(data);
                data = jsonParse(data);
                if(data.status){
                    clearInterval(timer);
                    modalDom.getElementsByTagName('text').item(2).innerHTML = "登录中...";
                    ajax.get(data.data.url,function (data) {
                        // console.warn(data);

                        //持久化cookie内容;
                        window.saveUserCookie&&saveUserCookie();
                        modal.dismissModal();
                        callback(true);
                    })
                }else{
                    modalDom.getElementsByTagName('text').item(2).innerHTML = data.message;
                }
            });
        }

        var timer = setInterval(getinfo,3000);
        setTimeout(getinfo,100);



        var modal = new tvOS.template.descriptiveAlert('登录账号',`https://www.kuaizhan.com/common/encode-png?large=true&data=${encodeURIComponent(data.url)}`,"使用bilibili手机客户端扫描上方二维码",[
            new tvOS.element.button("刷新二维码",function (e,button) {
                clearInterval(timer);
                // modal.dismissModal();
                openLogin(callback);
            }),
            new tvOS.element.button("取消",function (e,button) {
                clearInterval(timer);
                modal.dismissModal();
                callback(false)
            })
        ],' ',false);
        var modalDom = dom = modal.view;
        // loadingBox.dismissModal();
        modal.presentModal(dom);
    });
}
function openDynamic() {
    openVideoList("我的动态",function (page,callback,getPage) {
        ajax.get("https://api.bilibili.com/x/web-feed/feed?ps=10&pn="+page,function (data) {
            data = jsonParse(data);
            console.warn('我的动态',data);
            if(data.code==0){
                data = data.data;
                let items = [];
                var objectItem = false;
                try{
                    data.forEach(function (d) {
                    if(d.type == 0){
                        objectItem = new DataItem('video', d.archive.aid);
                        objectItem.cover = d.archive.pic;
                        objectItem.title = d.archive.title;
                        objectItem.class = d.archive.tname;
                        objectItem.face = d.archive.owner.face;
                        objectItem.user = d.archive.owner.name;
                        objectItem.onselect = function (e) {
                            openVideo(d.archive.aid, d.archive.title, true)
                        };
                        objectItem.onholdselect = function (e) {
                            openVideo(d.archive.aid, d.archive.title);
                        };
                        objectItem.onhighlight = function (e) {
                            getPage(page+1);
                        };
                    }else if(d.type == 1){
                        objectItem = new DataItem('video', d.bangumi.aid);
                        objectItem.cover = d.bangumi.cover;
                        objectItem.title = d.bangumi.title;
                        objectItem.onselect = function (e) {
                            openBangumi(d.bangumi.season_id);
                        };
                        objectItem.class = '';
                        objectItem.face = '';
                        objectItem.user = `更新至第 ${d.bangumi.new_ep.index} 集`;
                    }else{
                        console.warn("未知数据类型",d);
                    }
                    if(objectItem)items.push(objectItem);
                    });
                }
                catch {
                    
                }
                callback(items);
            }else{
                displayError(`加载错误 错误ID${data.code}`,)
            }
            callback(false)
        })
    },`<lockup prototype="video">
    <img binding="@src:{cover};" width="300" height="200"/>
    <overlay style="margin:0px;padding:5px;" >
        <text style="font-size:22px;tv-position:bottom-left;color: rgba(255, 255, 255, 0.9);" binding="textContent:{class};"></text>
    </overlay>
    <title binding="textContent:{title};" />
    <row>
        <img style="border-radius: circle;" binding="@src:{face};" width="32" height="32" />
        <text binding="textContent:{user};"></text>
    </row>
</lockup>`);


}
function openUser(mid) {
    if(mid<=0){
        displayError("错误 用户页面 缺少必要参数","mid");
        return;
    }
    var loading = tvOS.template.loading(`加载中...`);
    loading.display();
    ajax.get(`https://api.bilibili.com/x/member/web/account`,function (data) {
        data = jsonParse(data);
        if(data.code == 0){
            data = data.data;
            var up = data;

            var regtime = new Date();
            regtime.setTime(data.regtime*1000);
            var regtime_text = `${regtime.getFullYear()}-${regtime.getMonth()}-${regtime.getDate()}`

            var nameplate = "无";
            var nameplate_icon = "";

            if(data.nameplate){
                nameplate = data.nameplate.name;
                nameplate_icon = data.nameplate.image;
            }

            var page = tvOS.template.custom('');
            page.xml = `<document>
                                <productTemplate>
                                <background>
                                </background>
                                <banner>
                                    <infoList>
                                        <info>
                                            <header>
                                                <title>UID</title>
                                            </header>
                                            <text>${data.mid}</text>
                                        </info>
                                        <info>
                                            <header>
                                                <title>性别</title>
                                            </header>
                                            <text>${data.sex}</text>
                                        </info>
                                        <info>
                                            <header>
                                                <title>位置</title>
                                            </header>
                                            <text>${data.place}</text>
                                        </info>
                                        <info>
                                            <header>
                                                <title>注册于</title>
                                            </header>
                                            <text>${regtime_text}</text>
                                        </info>
                                        <info>
                                            <header>
                                                <title>勋章</title>
                                            </header>
                                            <text>${nameplate}</text>
                                        </info>
                                    </infoList>
                                    <stack>
                                        <title>${data.name}</title>
                                        <row>
                                            <text>${data.sign}</text>
                                        </row>
                                        <description id="description_more"></description>
                                        <row>
                                            <buttonLockup id="follow_button">
                                                <badge src="resource://button-rated" />
                                                <title>大概没关注</title>
                                            </buttonLockup>
                                            
                                            <buttonLockup>
                                                <badge src="resource://button-preview" />
                                                <title>视频</title>
                                            </buttonLockup>
                                            <buttonLockup>
                                                <badge src="resource://button-rated" />
                                                <title>专栏</title>
                                            </buttonLockup>
                                            <buttonLockup>
                                                <badge src="resource://button-rated" />
                                                <title>收藏</title>
                                            </buttonLockup>
                                            <buttonLockup>
                                                <badge src="resource://button-rated" />
                                                <title>订阅</title>
                                            </buttonLockup>
                                        </row>
                                    </stack>
                                    <heroImg src="${data.face}" />
                                </banner>
                            </productTemplate>
                        </document>`;

            test.uv = page.view;
            loading.replaceDocument(page);

            var productTemplate = page.view.getElementsByTagName('productTemplate').item(0);
            //填充公告
            // https://space.bilibili.com/ajax/settings/getNotice?mid=11336264
            ajax.get(`https://space.bilibili.com/ajax/settings/getNotice?mid=${mid}`,function (data) {
                data = jsonParse(data);
                if(data.status){
                    var notice = data.data.notice;
                    page.view.getElementById("description_more").textContent = notice;
                }
            });


            //https://api.bilibili.com/x/space/channel/index?mid=11336264&guest=false
            //确保顺序 所以放到 TA的投稿执行完成之后执行
            ajax.get(`https://space.bilibili.com/ajax/member/getSubmitVideos?mid=${mid}&page=1&pagesize=25`,function (data) {
                data = jsonParse(data);
                if(data.status){
                    var list = data.data.vlist;
                    var title = "TA的投稿";
                    if(!list)return;
                    var listKey = `list_up`;
                    up.archiveCount = data.data.count;

                    var shelf = page.view.createElement('shelf');
                    shelf.innerHTML = `
            <header>
                <title>${title} <text id="archiveCount">(${up.archiveCount?up.archiveCount:"?"})</text></title>
            </header>
            <prototypes>
                <lockup prototype="video">
                    <img binding="@src:{cover};" width="300" height="187"/>
                    <title style="font-size: 30;" binding="textContent:{title};" />
                    <description binding="textContent:{description};" style="text-align: center;font-size: 25;color:#fff" />
                </lockup>
                <lockup prototype="video-more">
                    <img src="${tvBaseURL}/images/more400.png" width="187" height="187" />
                    <title style="font-size: 30;" binding="textContent:{title};" />
                    <description binding="textContent:{description};" style="text-align: center;font-size: 25;color:#fff" />
                </lockup>
            </prototypes>
            <section id="${listKey}" binding="items:{${listKey}};" />`;
                    // test.shelf = shelf;
                    var section =  shelf.getElementsByTagName("section").item(0);
                    section.dataItem = new DataItem();
                    var datalist = list.map((av) => {
                        let objectItem = new DataItem('video', av.aid);
                        objectItem.cover = autoUrl2Https(av.pic);
                        objectItem.title = av.title;
                        objectItem.description = av.description;
                        objectItem.onselect = function (e) {
                            openVideo(av.aid, av.title, true)
                        };
                        objectItem.onholdselect = function (e) {
                            openVideo(av.aid, av.title);
                        };
                        return objectItem;
                    });
                    let moreButtonItem = new DataItem('video-more', up.mid);
                    moreButtonItem.title="更多";
                    moreButtonItem.onselect = function (e) {
                        openUserVideo(up.mid,`${up.name}的投稿 (${up.archiveCount})`);
                    };
                    datalist.push(moreButtonItem);

                    section.dataItem.setPropertyPath(listKey,datalist );
                    console.warn(section.dataItem);

                    let existShelf = productTemplate.getElementsByTagName("shelf");
                    if(existShelf.length == 0){
                        productTemplate.appendChild(shelf);
                    }else{
                        existShelf.item(0).insertBefore(shelf);
                    }
                }
            });

            //获取up的首页版块
            ajax.get(`https://api.bilibili.com/x/space/channel/index?mid=${mid}&guest=false`,function (data){
                data = jsonParse(data);
                console.warn('index',data);
                if(data.code == 0){
                    let channels = data.data;
                    console.warn('channels',channels);
                    channels.forEach(function (channel) {
                        let title = `${channel.name} (${channel.count})`;
                        let cid = channel.cid;
                        let listKey = "userChannel_"+cid;
                        let list = channel.archives;
                        if(!list)return
                        var shelf = page.view.createElement('shelf');
                        shelf.innerHTML = `
                            <header>
                                <title>${title}</title>
                            </header>
                            <prototypes>
                                <lockup prototype="video">
                                    <img binding="@src:{cover};" width="300" height="187"/>
                                    <title style="font-size: 30;" binding="textContent:{title};" />
                                    <description binding="textContent:{description};" style="text-align: center;font-size: 25;color:#fff" />
                                </lockup>
                                <lockup prototype="video-more">
                                    <img src="${tvBaseURL}/images/more400.png" width="187" height="187" />
                                    <title style="font-size: 30;" binding="textContent:{title};" />
                                    <description binding="textContent:{description};" style="text-align: center;font-size: 25;color:#fff" />
                                </lockup>
                            </prototypes>
                            <section id="${listKey}" binding="items:{${listKey}};" />`;
                        let section =  shelf.getElementsByTagName("section").item(0);
                        section.dataItem = new DataItem();
                        let datalist = list.map((av) => {
                            let objectItem = new DataItem('video', av.aid);
                            objectItem.cover = autoUrl2Https(av.pic);
                            objectItem.title = av.title;
                            objectItem.description = av.description;
                            objectItem.onselect = function (e) {
                                openVideo(av.aid, av.title, true)
                            };
                            objectItem.onholdselect = function (e) {
                                openVideo(av.aid, av.title);
                            };
                            return objectItem;
                        });
                        let moreButtonItem = new DataItem('video-more', up.mid);
                        moreButtonItem.title="更多";
                        moreButtonItem.onselect = function (e) {
                            openUserChannelVideo(up.mid,cid,title);
                            // openVideo(av.aid)
                        };
                        // moreButtonItem.description="更多";
                        datalist.push(moreButtonItem);
                        section.dataItem.setPropertyPath(listKey,datalist);
                        productTemplate.appendChild(shelf);
                    })
                }
            });

            let follow_button = page.view.getElementById("follow_button");
            let follow_button_badge = follow_button.getElementsByTagName("badge").item(0);
            let follow_button_title = follow_button.getElementsByTagName("title").item(0);

            follow_button.addEventListener("select",function () {

            })


            ajax.get(`https://api.bilibili.com/vipinfo/default?mid=${mid}&loginid=${userData.mid}`,function (data) {
                data = jsonParse(data);
                if(data.code == 0){
                    up.archiveCount = data.data.archiveCount;
                    up.following = data.data.following;
                    let archiveCountBox = page.view.getElementById("archiveCount");
                    if(archiveCountBox){
                        archiveCountBox.textContent = ` (${up.archiveCount})`
                    }

                    test.follow_button_badge = follow_button_badge;
                    if(up.following){

                        // follow_button.removeChild(follow_button_badge);
                        // follow_button_badge = page.view.createElement('badge');
                        // follow_button_badge.src = "resource://button-rated";
                        // follow_button_title.insertBefore(follow_button_badge);

                        follow_button_title.textContent = "已关注";
                    }else{
                        // follow_button.removeChild(follow_button_badge);
                        // follow_button_badge = page.view.createElement('badge');
                        // follow_button_badge.src = "resource://button-rate";
                        // follow_button_title.insertBefore(follow_button_badge);
                        follow_button_title.textContent = "未关注";
                    }
                }
            })

        }
    })
}
function openUserVideo(mid, title) {
    openVideoList(title,function (page,callback) {
        ajax.get(`https://space.bilibili.com/ajax/member/getSubmitVideos?mid=${mid}&page=${page}&pagesize=25`,function (data) {
            data = jsonParse(data);
            if(data.status){
                var list = data.data.vlist;
                if(!list){
                    callback(false);
                }
                var datalist = list.map((av) => {
                    let item = new DataItem('video', av.aid);;
                    item.aid = av.aid;
                    item.cover = autoUrl2Https(av.pic);
                    item.title = av.title;
                    item.description = av.description;
                    item.onselect = function (e) {
                        openVideo(av.aid, av.title, true)
                    };
                    objectItem.onholdselect = function (e) {
                        openVideo(av.aid, av.title);
                    };
                    return item;
                });
                callback(datalist);
            }else{
                return false;
            }
        })
    })
}
function openUserChannelVideo(mid,cid,title) {
    openVideoList(title,function (page,callback) {
        ajax.get(`https://api.bilibili.com/x/space/channel/video?mid=${mid}&cid=${cid}&pn=${page}&ps=30&order=0`,function (data) {
            data = jsonParse(data);
            if(data.code == 0){
                var list = data.data.list.archives;
                if(!list){
                    callback(false);
                }
                var datalist = list.map((av) => {
                    if(av.state<0)return;
                    let item = {};
                    item.id = av.aid;
                    item.aid = av.aid;
                    item.cover = autoUrl2Https(av.pic);
                    item.title = av.title;
                    item.description = av.description;
                    item.onselect = function (e) {
                        openVideo(av.aid, av.title, true)
                    };
                    item.onholdselect = function (e) {
                        openVideo(av.aid, av.title);
                    };
                    return item;
                });
                callback(datalist);
            }else{
                return false;
            }
        })
    })
    //
}
function openBangumi(sid) {
    //https://api.bilibili.com/pgc/view/web/season?season_id=${sid}
    ajax.get(`https://api.bilibili.com/pgc/view/web/season?season_id=${sid}`, function (data) {
    data = jsonParse(data);
    if(data.code == 0) {
        var result = data.result;
        var page = tvOS.template.custom('');

        var tags = "";
        var actor = "";
/*
        result.tags.forEach(function (tag) {
            tags+=`<textBadge>${tag.tag_name}</textBadge>`
        });
        result.actor.forEach(function (a) {
            actor+=`<text>${a.actor}</text>`
        });

        var index_show = "";
        if(result.media && result.media.episode_index && result.media.episode_index.index_show){
            index_show = result.media.episode_index.index_show
        }
*/
        page.xml = `<document>
                        <productTemplate>
                        <background>
                        </background>
                        <banner>
                            <infoList>
                                <info>
                                    <header>
                                        <title>番剧</title>
                                    </header>
                                </info>
                            </infoList>
                            <stack>
                                <title>${result.title}</title>
                                <row>
                                    <text>${result.publish.pub_time}</text>
                                </row>
                                <description id="description_more" allowsZooming="true" moreLabel="more">${result.evaluate}
                                </description>
                                <row>
                                    <buttonLockup id="play_button">
                                        <badge src="resource://button-preview" />
                                        <title>播放</title>
                                    </buttonLockup>
                                </row>
                            </stack>
                            <heroImg src="${result.cover}" />
                        </banner>
                        <shelf>
                            <header>
                                <title>剧集</title>
                            </header>
                            <prototypes>
                                <lockup prototype="bangumi">
                                    <img binding="@src:{cover};" width="300" height="187"/>
                                    <title style="font-size: 30;" binding="textContent:{title};" />
                                    <description binding="textContent:{description};" style="text-align: center;font-size: 25;color:#fff" />
                                </lockup>
                            </prototypes>
                            <section id="bangumi" binding="items:{bangumi};" />
                        </shelf>

                        <shelf>
                            <header>
                                <title>更多推荐</title>
                            </header>
                            <prototypes>
                                <lockup prototype="moreVideo">
                                    <img binding="@src:{cover};" width="250" height="333"/>
                                    <title style="font-size: 30;" binding="textContent:{title};" />
                                    <description binding="textContent:{description};" style="text-align: center;font-size: 25;color:#fff" />
                                </lockup>
                            </prototypes>
                            <section id="moreVideo" binding="items:{moreVideo};" />
                        </shelf>
                        <shelf>
                            <header>
                                <title>相关视频</title>
                            </header>
                            <prototypes>
                                <lockup prototype="tagVideo">
                                    <img binding="@src:{cover};" width="300" height="187"/>
                                    <title style="font-size: 30;" binding="textContent:{title};" />
                                    <description binding="textContent:{description};" style="text-align: center;font-size: 25;color:#fff" />
                                </lockup>
                            </prototypes>
                            <section id="tagVideo" binding="items:{tagVideo};" />
                        </shelf>
                        </productTemplate>
                        </document>`;

        page.view.getElementById("description_more").addEventListener("select",function (e) {
            let desc = tvOS.template.descriptiveAlert([result.bangumi_title,result.jp_title],'',`${index_show}\r\n\r\n${result.evaluate}\r\n\r\n${result.staff}`);
            // desc.background = result.cover;
            desc.presentModal();
            // tvOS.template.compilation(result.bangumi_title,result.jp_title,`${result.evaluate}\r\n${result.staff}`).display();
        });
        page.view.getElementById("play_button").addEventListener("select",function (e) {
            playBangumi(sid, result.episodes[0], getQualityApiValue(getUserSettings("Video_Quality")));
        });
        var bangumiSection = page.view.getElementById("bangumi")
        bangumiSection.dataItem = new DataItem();
        bangumiSection.dataItem.setPropertyPath("bangumi", result.episodes.map((av) => {
            let objectItem = new DataItem('bangumi', av.aid);
            objectItem.cover = av.cover;
            objectItem.title = av.title;
            objectItem.description = `第${av.title}话`;
            objectItem.onselect = function (e) {
                playBangumi(sid, av, getQualityApiValue(getUserSettings("Video_Quality")));
            };
            return objectItem;
        }));
        page.display();

        //加载相关视频
        ajax.get("https://api.bilibili.com/x/tag/info?tag_name="+encodeURI(result.title),function (tagData) {
            tagData = jsonParse(tagData);
            console.log('tagData',tagData);
            if(tagData.code == 0){
                let tagId  = tagData.data.tag_id;
                ajax.get(`https://api.bilibili.com/x/web-interface/tag/top?pn=1&ps=30&tid=${tagId}`,function (tagVideo) {
                    tagVideo = jsonParse(tagVideo);
                    console.log('tagVideo',tagVideo);
                    if(tagVideo.code == 0){
                        tagVideo = tagVideo.data;
                        var tagVideoSection = page.view.getElementById("tagVideo");
                        tagVideoSection.dataItem = new DataItem();
                        tagVideoSection.dataItem.setPropertyPath("tagVideo", tagVideo.map((av) => {
                            let objectItem = new DataItem('tagVideo', av.aid);
                            objectItem.cover = av.pic;
                            objectItem.title = av.title;
                            var up = '';
                            if(av.owner && av.owner.name){
                                up = av.owner.name;
                            }

                            objectItem.description = `UP:${up}  T:${av.tname}`;
                            objectItem.onselect = function (e) {
                                openVideo(av.aid*1, av.title, true);
                            };
                            objectItem.onholdselect = function (e) {
                                openVideo(av.aid, av.title);
                            };
                            return objectItem;
                        }));
                    }
                })
            }
        }) 

        //加载更多推荐  https://bangumi.bilibili.com/web_api/season/recommend/${sid}.json
        ajax.get(`https://api.bilibili.com/pgc/web/recommend/related/recommend?season_id=${sid}&from_pc=1`,function (more) {
            more = jsonParse(more);
            if(more.code == 0){
                more = more.result.season;
                var moreSection = page.view.getElementById("moreVideo");
                moreSection.dataItem = new DataItem();
                moreSection.dataItem.setPropertyPath("moreVideo", more.map((video) => {
                    let objectItem = new DataItem('moreVideo', video.season_id);
                    objectItem.cover = video.cover;
                    objectItem.title = video.title;
                    objectItem.onselect = function (e) {
                        openBangumi(video.season_id);
                    };
                    return objectItem;
                }));
            }
        })
    }
    })
}
function openVideoList(title, pageProcessing, prototypes='') {
    if(!prototypes)prototypes = `<lockup prototype="video">
    <img binding="@src:{cover};" width="200" height="300"/>
    <title binding="textContent:{title};" />
    <description  binding="textContent:{description};" style="font-size: 30;color:#fff" />
</lockup>`;
    var listView = tvOS.template.custom(`<document>
   <stackTemplate>
      <banner>
         <title>${title}</title>
      </banner>
      <collectionList>
         <grid>
            <prototypes>
                ${prototypes}
            </prototypes>
            <section id="video" binding="items:{video};" />
         </grid>
      </collectionList>
   </stackTemplate>
</document>`);
    var section = listView.view.getElementById("video");
    test.section = section;

    var openVideoList_loding = tvOS.template.loading(title+",加载中...");
    openVideoList_loding.display();
    section.dataItem = new DataItem();
    var dataItems = [];


    var nowPage = 0;
    var end = false;

    function getNextPage() {
        nowPage++;
        pageProcessing(nowPage,function (list) {
            if(list){
                list.forEach(function (v) {
                    dataItems.push(v);
                });
                section.dataItem.setPropertyPath("video",dataItems);
            }else{
                end = true;
            }
        },function (page) {
            if(page > nowPage)getNextPage();
        });
        if(openVideoList_loding){
            openVideoList_loding.replaceDocument(listView)
            openVideoList_loding = null;
        }
    }
    getNextPage();
}





function openVideo(aid, displayName=null, notAutoPlay=0, loadingView=null) {
    var loading;
    if (loadingView) {
        loading = loadingView;
    }
    else {
        var displayStr = `加载 AV${aid}`; 
        if(displayName != null)
        {
            displayStr = displayName;
        }
        loading = tvOS.template.loading(displayStr);
        loading.display();
    }

    getAvData(aid, 1, function (data) {
        if(data.isBangumi == true)
        {
            openBangumi(data.seasonID);
            loading.removeDocument();
            return;
        }
        
        var video = data;

        if (data.error_msg && data.error_msg.length) {
            loading.view.getElementsByTagName("title").item(0).innerHTML = `加载失败，重新加载 AV${aid}`;
            openVideo(aid, displayName, notAutoPlay, loading);
            return;
        }

        if(notAutoPlay==0 && data.part.length == 1){ //直接到播放界面
            loading.removeDocument();
            playVideo(data, 0, getQualityApiValue(getUserSettings("Video_Quality")));
            return;
        }
        var page = tvOS.template.custom(`<document>
    <productTemplate>
        <background>
        </background>
        <banner>
            <infoList>
                <info>
                    <header>
                        <title>ID</title>
                    </header>
                    <text>AV${data.aid}</text>
                </info>
                <info>
                    <header>
                        <title>UP主</title>
                    </header>
                    <text>${data.cardrich.name}</text>
                </info>
                <info>
                    <header>
                        <title>签名</title>
                    </header>
                    <text>${data.cardrich.sign}</text>
                </info>
                <!--<info>-->
                    <!--<header>-->
                        <!--<title>上传时间</title>-->
                    <!--</header>-->
                    <!--<text>BBBBBB</text>-->
                <!--</info>-->
            </infoList>
            <stack>
                <title>${data.wb_desc}</title>
                <!--<row>-->
                    <!--<text>UP主：</text>-->
                <!--</row>-->
                <description id="description_more" allowsZooming="true" moreLabel="more">${data.wb_summary}</description>
                <row>
                    <buttonLockup id="play_button">
                        <badge src="resource://button-preview" />
                        <title>播放</title>
                    </buttonLockup>
                    <buttonLockup id="up_button">
                        <badge src="resource://button-artist"/>
                        <title>${data.cardrich.name}</title>
                    </buttonLockup>
                </row>
            </stack>
            <heroImg src="${data.wb_img}" />
        </banner>
        <shelf>
            <header>
                <title>剧集</title>
            </header>
            <prototypes>
                <lockup prototype="video">
                    <img binding="@src:{cover};" width="300" height="187"/>
                    <title style="font-size: 30;" binding="textContent:{title};" />
                    <description binding="textContent:{description};" style="text-align: center;font-size: 25;color:#fff" />
                </lockup>
            </prototypes>
            <section id="video" binding="items:{video};" />
        </shelf>
    </productTemplate>
</document>`);

        page.view.getElementById("play_button").addEventListener("select",function (e) {
            playVideo(data, 0, getQualityApiValue(getUserSettings("Video_Quality")));
        });
        page.view.getElementById("up_button").addEventListener("select",function (e) {
            openUser(data.cardrich.mid);
        });

        var section = page.view.getElementById("video")
        section.dataItem = new DataItem();
        section.dataItem.setPropertyPath("video", data.part.map((p) => {
            let objectItem = new DataItem('video', p.page);
            objectItem.cover = video.wb_img;
            objectItem.title = p.name;
            objectItem.description = `P${p.page}`;
            objectItem.onselect = function (e){
                playVideo(data, p.page-1, getQualityApiValue(getUserSettings("Video_Quality")));
            };
                return objectItem;
        }));
        loading.replaceDocument(page);
    });
}

function initBar(){
    var bar = tvOS.template.menuBar([
        tvOS.element.menuItem('首页',function (e,menuItem) {
            
        }),
        tvOS.element.menuItem('番剧',function (e,menuItem) {
            if(!menuItem.hasDocument){
                timeline(function (v){
                    menuItem.setDocument(v);
                });
            }
        }),
        tvOS.element.menuItem('搜索',function (e,menuItem) {
            if(!menuItem.hasDocument){
                openSearchView(function (v){
                    menuItem.setDocument(v);
                });
            }
        }),
        tvOS.element.menuItem('我的',function (e,menuItem) {
            if(!menuItem.hasDocument){
                myHome(function (v) {
                    menuItem.setDocument(v);
                });
            }
        }),
        tvOS.element.menuItem('设置',function (e,menuItem) {
            if(!menuItem.hasDocument){
                openSettingsView(function (v) {
                    menuItem.setDocument(v);
                });
            }
        })
    ]);
    var barView = bar.view;
    bar.display(barView);
}

function openSettingsView(setDocument){
    var getDefaultQuality = getUserSettings("Video_Quality");
    if(getDefaultQuality == "")
    {
        getDefaultQuality = "3";
        saveUserSettings("Video_Quality", getDefaultQuality);
    }
    
    var settingsPage = tvOS.template.custom(`<document>
   <listTemplate>
      <banner>
         <title>设置</title>
      </banner>
      <list>
         <section>
            <listItemLockup id="setBtn_playQuality">
               <title>播放</title>
               <subtitle id="setBtn_playQuality_current">清晰度：${getQualityStr(getDefaultQuality)}</subtitle>
               <relatedContent>
                  <lockup>
                     <title>播放清晰度</title>
                     <description>调整播放视频时的首选清晰度</description>
                  </lockup>
               </relatedContent>
            </listItemLockup>
            <listItemLockup id="setBtn_debug">
               <title>调试</title>
               <relatedContent>
                  <lockup>
                     <title>调试</title>
                     <description>使用开发者功能</description>
                  </lockup>
               </relatedContent>
            </listItemLockup>
            <listItemLockup id="setBtn_about">
               <title>关于</title>
               <relatedContent>
                  <lockup>
                     <title>关于应用</title>
                     <description>了解此应用程序的详细信息，或取得协助。</description>
                  </lockup>
               </relatedContent>
            </listItemLockup>
         </section>
      </list>
   </listTemplate>
</document>`);

    settingsPage.view.getElementById("setBtn_playQuality").addEventListener("select",function (e) {
        changeVideoQuality(function (s) {
            if(s){
                openSettingsView(setDocument);
            }
        });
    });
    
    settingsPage.view.getElementById("setBtn_debug").addEventListener("select",function (e) {
        reloadView();
    });
    
    settingsPage.view.getElementById("setBtn_about").addEventListener("select",function (e) {
            
    });

    setDocument(settingsPage); 
}

function reloadView(){
    let button = new tvOS.element.button('好',function () {
        App.reload({});
    });
    var alert = new tvOS.template.alert('请问要重新加载应用程序吗？','按下此按钮将会将应用程序全部重新初始化，所有未保存的内容将会丢失。',button,'此操作不可逆');
    alert.presentModal();
}

function testView(testInfo){
    let button = new tvOS.element.button('测试',function () {
        // var alert3 = new tvOS.template.alert('333333'||'测试标题',['描述1','description2'],[button,button2],['footTexts1','footTexts2']);
        // alert3.presentModal();


    });
    let button2 = new tvOS.element.button('测试',function () {
        console.warn('测试按钮2')
    });
    var alert = new tvOS.template.alert(testInfo||'测试标题',['描述1','description2'],[button,button2],['footTexts1','footTexts2']);
    return alert;
}

function getQualityStr(id)
{
    switch(id){
        case "0": {
            return "流畅";
            break;
        }
        case "1": {
            return "清晰";
            break;
        }
        case "2": {
            return "高清";
            break;
        }
        case "3": {
            return "1080P";
            break;
        }
        case "4": {
            return "1080P+";
            break;
        }
        default: {
            return "1080P";
            break;
        }
    }
}

function getQualityApiValue(id)
{
    switch(id){
        case "0": {
            return 15;
            break;
        }
        case "1": {
            return 32;
            break;
        }
        case "2": {
            return 64;
            break;
        }
        case "3": {
            return 80;
            break;
        }
        case "3": {
            return 112;
            break;
        }
        default: {
            return 80;
            break;
        }
    }
}

function changeVideoQuality(callback=function () {}) {
    let xml = `<document>
   <descriptiveAlertTemplate>
      <title>选择清晰度</title>
      <description>在以下清晰度中选择一项，将会优先使用选择的清晰度播放。</description>
      <row>
         <button id="qBtn_low">
            <text>流畅</text>
         </button>
         <button id="qBtn_medium">
            <text>清晰</text>
         </button>
         <button id="qBtn_high">
            <text>高清</text>
         </button>
         <button id="qBtn_ultra">
            <text>1080P</text>
         </button>
      </row>
   </descriptiveAlertTemplate>
</document>`;
    let parser = new DOMParser();
    let parsed = parser.parseFromString(xml.replace(new RegExp('&', 'g'), '&amp;'), "application/xml");
    
    parsed.getElementById("qBtn_low").addEventListener("select",function (e) {
        saveUserSettings("Video_Quality", "0");
        callback(true);
        navigationDocument.dismissModal();
    });
    parsed.getElementById("qBtn_medium").addEventListener("select",function (e) {
        saveUserSettings("Video_Quality", "1");
        callback(true);
        navigationDocument.dismissModal();
    });
    parsed.getElementById("qBtn_high").addEventListener("select",function (e) {
        saveUserSettings("Video_Quality", "2");
        callback(true);
        navigationDocument.dismissModal();
    });
    parsed.getElementById("qBtn_ultra").addEventListener("select",function (e) {
        saveUserSettings("Video_Quality", "3");
        callback(true);
        navigationDocument.dismissModal();
    });
    navigationDocument.presentModal(parsed);
}


function getAvData(id,page,cd){ 
    var url = `https://www.bilibili.com/video/av${id}/?p=${page}`;
    ajax.get(url, function (html) {
       var isNoInfo = false;
       try{
            var playinfoJson = html
            .match(/__playinfo__=(.*?)<\/script>/g)
            .map(m => m.replace(/^__playinfo__=(.*?)<\/script>$/, '$1'))[0];
            var playinfo = JSON.parse(playinfoJson);
        }catch(exception) {
            isNoInfo = true;
        }

       var InitialStateJson = html
       .match(/__INITIAL_STATE__=(.*?)};/g)
       .map(m => m.replace(/^__INITIAL_STATE__=(.*?)};$/, '$1}'))[0];

       var InitialState = JSON.parse(InitialStateJson);
       if(InitialState.videoData == undefined)
       {
            const data = {
                isBangumi: true,
                seasonID: InitialState.ssId
            }
           cd(data);
           return;
       }
       
       var videoData = InitialState.videoData;
       var upData = InitialState.upData;

       const part = videoData.pages.map((v, i) => {

        v.name = v.part;
        if(v.page == page && !isNoInfo){
            v.playData = playinfo.data;
        }
        return v;
       });

       const cardrich = upData;
       const data = {
        aid: id,
        wb_full_url: url,
        wb_img: videoData.pic,
        wb_desc: videoData.title,
        wb_summary: videoData.desc,
        part: part,
        cardrich: cardrich,
        gt_InitialState: InitialState
       }
       cd(data);
    });


}

function reload() {
    App.reload({});
}

App.onError = function (message, sourceURL, line){
    // console.log(message, sourceURL, line);
    displayError("发生错误",`${message}\r\n\r\n${sourceURL} : ${line}`);
};
var now = new Date();
var beginTime = now.getSeconds();
evaluateScripts([tvBaseURL+'/tvOS2.js'], function (success) {
    if(success){
        initBar();
        //获取之前持久化的cookie
        window.getUserCookie&&getUserCookie();
    }else{
        displayError("加载外部JS文件出现错误!",tvBaseURL+'/tvOS2.js');
    }
});

function playVideo(infoData, page, quality=0)
{
    biliApiRequest(infoData.aid, infoData.part[page].cid, null, quality, false, false, function (detail){
        openVideoWindow(infoData.aid, null, detail, infoData.wb_img, page, infoData.wb_desc, infoData.wb_desc);
    }); 
}

function playBangumi(sid, videoInfo, quality=0)
{
        var epcid = videoInfo.cid;
        var avid = videoInfo.aid;
        var ep_id = videoInfo.id;
        if(epcid === "")
        {
            Alert("无法加载此番剧","调用接口时返回了异常数据");
            return;
        }
        biliApiRequest(avid, epcid, ep_id, quality, true, false, function (detail){
            openVideoWindow(videoInfo.av_id, sid, detail, videoInfo.cover, videoInfo.index, videoInfo.index_title, `第 ${videoInfo.index} 话`, true);
        }); 
}

function openVideoWindow(aid, sid, detail, imageURL, page, title, desc, isBangumi = null)
{
        let videoList = new DMPlaylist();
        let video = null;
        if(isBangumi) {
            try{
                var base_url = detail.result.dash.video[0].base_url;
            }catch(exception) {
                displayError("播放失败","视频地址获取错误");
                return;
            }            
            video = new DMMediaItem('video', base_url); 
            video.url = base_url;
            video.artworkImageURL = imageURL;
            video.options = {
                headers: {
                    "User-Agent": 'ua',
                    "referer": "https://www.bilibili.com/bangumi/play/ss" + sid
                }
            };
            video.title = `第 ${page} 话 - ${title}`;
        } else {
            try{
                var base_url = detail.data.dash.video[0].base_url;
            }catch(exception) {
                displayError("播放失败","视频地址获取错误");
                return;
            }
            video = new DMMediaItem('video', base_url); 
            video.url = base_url;
            video.artworkImageURL = imageURL;
            video.options = {
                headers: {
                    "User-Agent": ua,
                    "referer": "https://www.bilibili.com/video/av" + aid
                }
            };
            video.title = `P${page} - ${title}`;
        }
        
        video.description = desc;
        videoList.push(video);
        if(nowPlayer)nowPlayer.stop();
        let myPlayer = new DMPlayer();
        nowPlayer = myPlayer;
        myPlayer.playlist = videoList;
        myPlayer.addEventListener('stateDidChange', function(listener, extraInfo) {
            console.log("state: " + listener.state);
        },{});
        myPlayer.play() 
}

var api_url = 'https://api.bilibili.com/x/player/playurl?';  //http://interface.bilibili.com/v2/playurl?
var bangumi_api_url = 'https://api.bilibili.com/pgc/player/web/playurl?';  //http://bangumi.bilibili.com/player/web_api/playurl?

function biliApiRequest(avid, cid, ep_id, quality, bangumi = null, bangumi_movie = null, rd)
{
    var ts = (new Date()).getTime().toString();
    var endTime = now.getSeconds(); //获取当前秒数
    var deltaTime = (endTime - beginTime);//获取，两者所差秒数，即js代码运行时间。
    var session = genMD5(deltaTime.toString());
    if(bangumi)
    {
        var params_str = 'avid=' + avid + '&cid=' + cid + '&bvid=' + '&qn=' + quality + '&type' + 
        '&otype=json' + '&ep_id=' + ep_id + '&fourk=1' + '&fnver=0' + '&fnval=16' + '&session=' + session;
        var genApiUrl = bangumi_api_url + params_str;
        var resultData = null;
        ajax.get(genApiUrl,function (data) {
            resultData = JSON.parse(data);
            rd(resultData);
        });
    }
    else
    {
        var params_str = 'avid=' + avid + '&cid=' + cid + '&bvid=' + '&qn=' + quality + '&type' + 
        '&otype=json' + '&fnver=0' + '&fnval=16' + '&session=' + session;
        var genApiUrl = api_url + params_str;  
        var resultData = null;
        ajax.get(genApiUrl, function (data) {
            resultData = JSON.parse(data);
            rd(resultData);
        });
    }
}


function genMD5(value)
{
    var MD5 = function(d){result = M(V(Y(X(d),8*d.length)));return result.toLowerCase()};function M(d){for(var _,m="0123456789ABCDEF",f="",r=0;r<d.length;r++)_=d.charCodeAt(r),f+=m.charAt(_>>>4&15)+m.charAt(15&_);return f}function X(d){for(var _=Array(d.length>>2),m=0;m<_.length;m++)_[m]=0;for(m=0;m<8*d.length;m+=8)_[m>>5]|=(255&d.charCodeAt(m/8))<<m%32;return _}function V(d){for(var _="",m=0;m<32*d.length;m+=8)_+=String.fromCharCode(d[m>>5]>>>m%32&255);return _}function Y(d,_){d[_>>5]|=128<<_%32,d[14+(_+64>>>9<<4)]=_;for(var m=1732584193,f=-271733879,r=-1732584194,i=271733878,n=0;n<d.length;n+=16){var h=m,t=f,g=r,e=i;f=md5_ii(f=md5_ii(f=md5_ii(f=md5_ii(f=md5_hh(f=md5_hh(f=md5_hh(f=md5_hh(f=md5_gg(f=md5_gg(f=md5_gg(f=md5_gg(f=md5_ff(f=md5_ff(f=md5_ff(f=md5_ff(f,r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+0],7,-680876936),f,r,d[n+1],12,-389564586),m,f,d[n+2],17,606105819),i,m,d[n+3],22,-1044525330),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+4],7,-176418897),f,r,d[n+5],12,1200080426),m,f,d[n+6],17,-1473231341),i,m,d[n+7],22,-45705983),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+8],7,1770035416),f,r,d[n+9],12,-1958414417),m,f,d[n+10],17,-42063),i,m,d[n+11],22,-1990404162),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+12],7,1804603682),f,r,d[n+13],12,-40341101),m,f,d[n+14],17,-1502002290),i,m,d[n+15],22,1236535329),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+1],5,-165796510),f,r,d[n+6],9,-1069501632),m,f,d[n+11],14,643717713),i,m,d[n+0],20,-373897302),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+5],5,-701558691),f,r,d[n+10],9,38016083),m,f,d[n+15],14,-660478335),i,m,d[n+4],20,-405537848),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+9],5,568446438),f,r,d[n+14],9,-1019803690),m,f,d[n+3],14,-187363961),i,m,d[n+8],20,1163531501),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+13],5,-1444681467),f,r,d[n+2],9,-51403784),m,f,d[n+7],14,1735328473),i,m,d[n+12],20,-1926607734),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+5],4,-378558),f,r,d[n+8],11,-2022574463),m,f,d[n+11],16,1839030562),i,m,d[n+14],23,-35309556),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+1],4,-1530992060),f,r,d[n+4],11,1272893353),m,f,d[n+7],16,-155497632),i,m,d[n+10],23,-1094730640),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+13],4,681279174),f,r,d[n+0],11,-358537222),m,f,d[n+3],16,-722521979),i,m,d[n+6],23,76029189),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+9],4,-640364487),f,r,d[n+12],11,-421815835),m,f,d[n+15],16,530742520),i,m,d[n+2],23,-995338651),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+0],6,-198630844),f,r,d[n+7],10,1126891415),m,f,d[n+14],15,-1416354905),i,m,d[n+5],21,-57434055),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+12],6,1700485571),f,r,d[n+3],10,-1894986606),m,f,d[n+10],15,-1051523),i,m,d[n+1],21,-2054922799),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+8],6,1873313359),f,r,d[n+15],10,-30611744),m,f,d[n+6],15,-1560198380),i,m,d[n+13],21,1309151649),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+4],6,-145523070),f,r,d[n+11],10,-1120210379),m,f,d[n+2],15,718787259),i,m,d[n+9],21,-343485551),m=safe_add(m,h),f=safe_add(f,t),r=safe_add(r,g),i=safe_add(i,e)}return Array(m,f,r,i)}function md5_cmn(d,_,m,f,r,i){return safe_add(bit_rol(safe_add(safe_add(_,d),safe_add(f,i)),r),m)}function md5_ff(d,_,m,f,r,i,n){return md5_cmn(_&m|~_&f,d,_,r,i,n)}function md5_gg(d,_,m,f,r,i,n){return md5_cmn(_&f|m&~f,d,_,r,i,n)}function md5_hh(d,_,m,f,r,i,n){return md5_cmn(_^m^f,d,_,r,i,n)}function md5_ii(d,_,m,f,r,i,n){return md5_cmn(m^(_|~f),d,_,r,i,n)}function safe_add(d,_){var m=(65535&d)+(65535&_);return(d>>16)+(_>>16)+(m>>16)<<16|65535&m}function bit_rol(d,_){return d<<_|d>>>32-_}

    var result = MD5(value);
    return result;
}
