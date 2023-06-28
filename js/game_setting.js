/**
 * Created by lieberli on 2017/5/23.
 */

var keycode_map = {0:"",1:"鼠标中键",9:"Tab", 13:"Enter", 16:"Shift", 17:"Ctrl", 18:"Alt",
    19:"Pausebreak", 20:"Capslock", 32:"Space", 33:"Pageup",34:"Pagedown", 35:"End", 36:"Home",
    37:"Left", 38:"Up", 39:"Right", 40:"Down", 43:"+", 44:"Printscreen", 45:"Insert", 46:"Delete",
    48:"0",49:"1",50:"2",51:"3", 52:"4",53:"5",54:"6",55:"7",56:"8",57:"9",65:"A",66:"B",
    67:"C",68:"D",69:"E",70:"F",71:"G",72:"H",73:"I",74:"J",75:"K",76:"L",77:"M",78:"N",
    79:"O",80:"P",81:"Q",82:"R",83:"S",84:"T",85:"U",86:"V",
    87:"W",88:"X",89:"Y",90:"Z",96:"Num0", 97:"Num1", 98:"Num2",
    99:"Num3", 100:"Num4", 101:"Num5", 102:"Num6", 103:"Num7", 104:"Num8", 105:"Num9",
    106: "*", 107:"+",109:"-", 110:".",111: "/",112:"F1", 113:"F2", 114:"F3", 115:"F4",
    116:"F5", 117:"F6", 118:"F7",119:"F8", 120:"F9", 121:"F10", 122:"F11", 123:"F12",
    144:"Numlock", 145:"Scrolllock", 186:";", 187:"=",
    188:",", 189:"-",190:".", 191:"/", 192:"`", 219:"[", 220:"\\", 221:"]", 222:"'"};

var auto_sync_default = true;
var auto_update_default = false;
var auto_show_cross_default = 1;
var snapshot_cross_default = 0;
var cheat_test_mode_default = 0;
var current_tab = "";
var vueCon = null;
var nickname_errorcode = {
    "NickNameServiceMaintain": 8013000,
    "NickNameNotUnique": 8013002,
    "NickNameChangeTimeLimit": 8013003, // 修改时间未到
    "NickNameInvalidFormat": 8013004, // 非法的格式
    "NickNameTooLong": 8013005, // 昵称长度过长
    "NickNameIllegal": 8013006, // 昵称内容非法
};

function safe_callcpp(func, param) {
    try {
        window.external.callcpp(func, param);
    } catch (e) {}
}

/**
 * cookie相关操作函数。
 */
var $cookie = {
	//https://developer.mozilla.org/en-US/docs/Web/API/document.cookie
	//注意有坑:在ie上设cookie,过期时间不支持max-age,只支持expires.
	set: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
		if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; }
		var sExpires = "";
		if (vEnd) {
			switch (vEnd.constructor) {
				case Number:
					sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
					break;
				case String:
					sExpires = "; expires=" + vEnd;
					break;
				case Date:
					sExpires = "; expires=" + vEnd.toUTCString();
					break;
			}
		}
		document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
		return true;
	},
	get : function(name){
		if(!name || !this.has(name)){
			return null;
		}
		var reg = new RegExp("(?:^|.*;\\s*)" + encodeURIComponent(name).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*");
		return decodeURIComponent(document.cookie.replace(reg, "$1"));
	},
	del : function(name, domain){
		if(!name || !this.has(name)){
			return false;
		}
		document.cookie = encodeURIComponent(name) + "=; max-age=0; path=/; "+"domain=" + domain;
		return true;
	},
	has : function(name){
		var reg = new RegExp("(?:^|;\\s*)" + encodeURIComponent(name).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=");
		return reg.test(document.cookie);
	}
};

var TCSS = {
    jsFileLoad : false,
    //  param 为空的话，默认统计的数据不区分?后面的参数，否则为k-v格式参数.具体参数表示：
    //  senseParam:"**", //适用于区分?参数的统计
    //  virtualURL:"**", //虚拟URL地址的统计
    //  ... 其他参数详见tcss js上报指引   (上面)
    visited : function(param) {
        if (!param) {
            param = {};
        }
        param.repeatApplay = "true";
        try {
            this.jsFileLoad ? pgvMain(param) : this.loadJSFile(function() {
                (typeof pgvMain === "function") && pgvMain(param);
            });
        } catch(e) {}
    },

    // 点击流统计，参数为tag分类。TCSS规定为4级分类。
    // path_of_tag just like : "PLS.".

    clicked : function(path_of_tag) {
        try {
            this.jsFileLoad ? pgvSendClick({hottag:path_of_tag}) : this.loadJSFile(function() {
                (typeof pgvSendClick === "function") && (pgvSendClick({hottag:path_of_tag}));
            });
         }catch(e){}
    },

    // 加载TCSS统计主文件
     loadJSFile : function(callback) {
        var self = this;
        var node = document.createElement('script'),
            script = document.getElementsByTagName('script')[0];
        node.src = location.protocol == "https:" ? "//pingjs.qq.com/tcss.ping.https.js" : "//pingjs.qq.com/tcss.ping.js";
        node.type = 'text/javascript';
        node.onload = node.onerror = node.onreadystatechange = function() {
            /loaded|complete|undefined/.test(node.readyState) && function() {
                node.onload = node.onerror = node.onreadystatechange = null;
                node.parentNode.removeChild(node);
                node = undefined;
                self.jsFileLoad = true;
                callback();
            }();
        };
        script.parentNode.insertBefore(node, script);
    }
};

function reportClicked(ext) {
    if (railSettingView.info.client_mode == 2) {
        return;
    }
    TCSS.clicked('wegame_rail_setting.' + railSettingView.info.game_id + '.' + ext);
}

function RegEditEvent(edit_id) {
    $(edit_id).keydown(function(){
        return UpdateHotKeyUI(event, edit_id);
    });
    $(edit_id).keyup(function(){
        return OnKeyUp(event, edit_id);
    });
}

function SaveConfig() {
    if (vueCon.has_nickname_error || vueCon.has_relate_nickname_error) {
        showSubView(current_tab, false);
        showSubView("tab_nickname", true);
        SetCurSel("tab_nickname");
        return;
    }
    if (railSettingView.show_nickname == 1) {
        var cur_nickname = $("#nickname_editor").val();
        if (cur_nickname != "" && cur_nickname != railSettingView.original_nickname && cur_nickname != railSettingView.last_success_nickname) {
            railSettingView.check_nickname_before_save = true;
            return;
        }
    }
    if (railSettingView.relate_nickname_cfg.enable_modify_relate_nickename == 1) {
        var cur_nickname = $("#relate_nickname_editor").val();
        if (cur_nickname != "" && cur_nickname != railSettingView.relate_nickname && cur_nickname != railSettingView.last_success_relate_nickname) {
            railSettingView.check_nickname_before_save = true;
            return;
        }
    }

    var json_param = railSettingView.GetUIConfig();
    var json_str = JSON.stringify(json_param);
    safe_callcpp('jc_save', json_str);
}

function Cancel() {
    CloseWnd();
}

function CloseWnd() {
    safe_callcpp('jc_cancel', '');
}

function GetDefaultConfig() {
    var json_param = {
        "hotkey":{
            "friendlist":131081,
            "reply":131085,
            "inviter_accept":131161,
            "inviter_ignore":131150
        },
        "switcher":{"icon":0,"msg":0,"state":0,"inviter":0,"add_friend":0},
        "profile":{"auto_sync":1},"game":{"auto_update":0},"client_custom_cmd":"",
        "cheat_test_mode": 0};

    json_param.profile.auto_sync = (auto_sync_default ? 1 : 0);
    json_param.game.auto_update = (auto_update_default ? 1 : 0);
    json_param.show_cross = (auto_show_cross_default ? 1 : 0);
    json_param.cheat_test_mode = (cheat_test_mode_default ? 1 : 0);
    json_param.snapshot_cross = (snapshot_cross_default ? 1 : 0);

    return json_param;
}

function GetEmptyConfig() {
    var json_param = {"show_cross":0,"hotkey":{"friendlist":0,"reply":0,"inviter_accept":0,"inviter_ignore":0},
        "switcher":{"icon":0,"msg":0,"state":0,"inviter":0,"add_friend":0},
        "profile":{"auto_sync":0},"game":{"auto_update":0},"client_custom_cmd":"",
        "cheat_test_mode": 0};
    return json_param;
}

function GetDefaultHotkey(obj_id_edit) {
    var hotkey = "";

    if (obj_id_edit == "#edit_friendlist") {
        hotkey = "Shift+Tab";
    } else if (obj_id_edit == "#edit_reply") {
        hotkey = "Shift+Enter";
    } else if (obj_id_edit == "#edit_inviter_accept") {
        hotkey = "Shift+Y";
    } else if (obj_id_edit == "#edit_inviter_ignore") {
        hotkey = "Shift+N";
    }

    return hotkey;
}

function CheckConflict(obj_id_edit, obj_id_label) {
    var cur_val = $(obj_id_edit).val();
    SetConflict(cur_val, obj_id_edit, obj_id_label);
    ResetConflict();
}

function CheckConflict2(cur_val, obj_id_edit, obj_id_label) {
    SetConflict(cur_val, obj_id_edit, obj_id_label);
    ResetConflict();
}

function SetConflict(cur_val, obj_id_edit, obj_id_label) {
    var conflict = false;

    if (cur_val != "") {
        if (!conflict && obj_id_edit != "#edit_friendlist"
            && cur_val == $("#edit_friendlist").val()) {
            conflict = true;
        }
        if (!conflict && obj_id_edit != "#edit_reply" && cur_val == $("#edit_reply").val()) {
            conflict = true;
        }
        if (!conflict && obj_id_edit != "#edit_inviter_accept"
            && cur_val == $("#edit_inviter_accept").val()) {
            conflict = true;
        }
        if (!conflict && obj_id_edit != "#edit_inviter_ignore"
            && cur_val == $("#edit_inviter_ignore").val()) {
            conflict = true;
        }
    }

    if (conflict) {
        $(obj_id_edit).parent().parent().find(".error-tips").removeClass("hide");
    }
}

function ResetConflict() {
    var conflict = false;

    if (IsConflict("#edit_friendlist")) {
        conflict = true;
    } else {
        ClearConflictFlag("#edit_friendlist");
    }
    if (IsConflict("#edit_reply")) {
        conflict = true;
    } else {
        ClearConflictFlag("#edit_reply");
    }
    if (IsConflict("#edit_inviter_accept")) {
        conflict = true;
    } else {
        ClearConflictFlag("#edit_inviter_accept");
    }
    if (IsConflict("#edit_inviter_ignore")) {
        conflict = true;
    } else {
        ClearConflictFlag("#edit_inviter_ignore");
    }

    if (conflict) {
        $("#btn_save").addClass("disabled");
    } else {
        $("#btn_save").removeClass("disabled");
    }
}

function IsConflict(edit_id) {
    var conflict = false;

    var val = $(edit_id).val();
    if (val.length != 0) {
        do {
            if (edit_id != "#edit_friendlist" && val == $("#edit_friendlist").val()) {
                conflict = true;
                break;
            }
            if (edit_id != "#edit_reply" && val == $("#edit_reply").val()) {
                conflict = true;
                break;
            }
            if (edit_id != "#edit_inviter_accept" && val == $("#edit_inviter_accept").val()) {
                conflict = true;
                break;
            }
            if (edit_id != "#edit_inviter_ignore" && val == $("#edit_inviter_ignore").val()) {
                conflict = true;
                break;
            }
        } while (false);
    }

    return conflict;
}

function ClearConflictFlag(obj_id_label) {
    $(obj_id_label).parent().parent().find(".error-tips").addClass("hide");
}

function code_to_key_transfer(keycode) {
    if (keycode_map[keycode]) {
        return keycode_map[keycode];
    } else {
        return '';
    }
}

function code_to_hotkey_transfer(hotkey_code) {
    var hotkey = "";
    var CHK_CONTROL = 0x0001 << 16;
    var CHK_SHIFT = 0x0002 << 16;
    var CHK_ALT= 0x0004 << 16;
    if(hotkey_code & CHK_CONTROL)
        hotkey += "Ctrl+";
    if(hotkey_code & CHK_SHIFT)
        hotkey += "Shift+";
    if(hotkey_code & CHK_ALT)
        hotkey += "Alt+";
    hotkey += code_to_key_transfer( hotkey_code & 0x0000FFFF);
    return hotkey;
}

function hotkey_to_code_transfer(key_code){
    var CHK_CONTROL = 0, CHK_SHIFT = 0, CHK_ALT=0;
    if(key_code.indexOf("Ctrl") != -1)
        CHK_CONTROL = 0x0001;
    if(key_code.indexOf("Shift") != -1)
        CHK_SHIFT = 0x0002;
    if(key_code.indexOf("Alt") != -1)
        CHK_ALT = 0x0004;
    var normal_key_index = key_code.lastIndexOf("+");
    if(normal_key_index != -1) {
        key_code = key_code.substr(normal_key_index + 1);
    }
    if (key_code.length == 1 && (key_code[0] >= 'a' && key_code[0] <= 'z')) {
        key_code = key_code.toUpperCase();
    }

    var normal_keycode = 0;
    $.each(keycode_map, function (key, val) {
        if (val == key_code) {
            normal_keycode = +key;
            return;
        }
    });

    return ((CHK_CONTROL | CHK_SHIFT | CHK_ALT) << 16) + normal_keycode;
}

function UpdateHotKeyUI(e, obj_id_edit) {
    var pre_key = $(obj_id_edit).attr("value");
    var input_id = 0;
    var pre_code = null;
    $.each(keycode_map, function (key, val) {
        if (val == pre_key) {
            pre_code = key;
            return;
        }
    });
    var key_code;
    var real_key = "";
    $(obj_id_edit).attr("value", "");
    if (window.event){
        key_code = e.keyCode;
    } else if (e.which) {
        key_code = e.which;
    }
    if (key_code == 8 || key_code == 27) { // 排除Backspace,Esc键
        key_code = 0;
        if (pre_key == "") {
            $(obj_id_edit).attr("value", GetDefaultHotkey(obj_id_edit));
        }
        CheckConflict(obj_id_edit);
        return false;
    } else {
        if (key_code != 16 && key_code != 17 && key_code != 18) {
            real_key = code_to_key_transfer(key_code);
        }
    }

    var val;
    if (event.ctrlKey) {
        val = "Ctrl+";
    }
    if (event.altKey) {
        val = "Alt+";
    }
    if (event.shiftKey) {
        val = "Shift+";
    }
    if(event.ctrlKey && event.shiftKey){
        val = "Ctrl+Shift+";
    }
    if(event.ctrlKey && event.altKey){
        val = "Ctrl+Alt+";
    }
    if(event.altKey && event.shiftKey){
        val = "Shift+Alt+";
    }
    if(event.ctrlKey && event.shiftKey && event.altKey){
        val = "Ctrl+Shift+Alt+";
    }
    if(!event.ctrlKey && !event.shiftKey && !event.altKey) {
        val = "";
    }

    val += real_key;
    $(obj_id_edit).attr("value", val);
    CheckConflict2(val, obj_id_edit);

    return false;
}

function OnKeyUp(e, obj_id_edit) {
    var val = $(obj_id_edit).attr("value");
    if (val == "Ctrl+" ||
        val == "Alt+" ||
        val == "Shift+" ||
        val == "Ctrl+Shift+" ||
        val == "Ctrl+Alt+" ||
        val == "Shift+Alt+" ||
        val == "Ctrl+Shift+Alt+" ||
        val == "") {
        $(obj_id_edit).attr("value", GetDefaultHotkey(obj_id_edit));
        CheckConflict(obj_id_edit);
    }
}

function SetCurSel(tab_id) {
    if (tab_id != current_tab) {
        $("#" + tab_id).addClass("cur").siblings().removeClass("cur");
        current_tab = tab_id;
        reportClicked(tab_id);
    }
}

function UploadProfile() {
    safe_callcpp('jc_upload_profile', '');
}

function DownloadProfile() {
    safe_callcpp('jc_download_profile', '');
}

function OpenDirectory() {
    safe_callcpp('jc_open_game_dir', '');
}

function UninstallGame() {
    safe_callcpp('jc_uninstall_game', '');
}

function getClientInfo() {
    safe_callcpp('jc_get_client_info', '');
}

function getBranchInfo () {
    safe_callcpp('jc_query_branch_info', '');
}

function queryCrossConfig() {
    safe_callcpp('jc_query_config', '');
}

function getGameDetailFromOss(game_id, lang) {
    return new Promise(function(resolve, reject) {
        if (railSettingView.info.client_mode == 2) { // 离线模式
            resolve({});
        } else {
            var op = {
                "game_ids": [game_id],
                "stamp": {
                    "agent_client_language": lang
                }
            };
            $.ajax({
                url: "https://www.wegame.com.cn/api/rail/web/data_filter/game_info/by_game_id",
                data: JSON.stringify(op),
                dataType: "json",
                xhrFields: {withCredentials:true},
                contentType: "application/json; charset=utf-8",
                type: "POST",
                timeout: 5000
            })
            .done(function(res) {
                try {
                    if (res.result.error_code == 0) {
                        resolve(res.items[0] || {});
                        return;
                    }
                    resolve({});
                } catch (e) {
                    resolve({});
                }
            })
            .fail(function(err) {
                resolve({});
            });
        }
    });
}

function getConsoleGameInfoFromOss(game_id, lang) {
    return new Promise(function(resolve, reject) {
        if (railSettingView.info.client_mode == 2) {
            resolve({});
        } else {
            var op = {
                "data_names": "rail_console_game_config",
                "command": "by_game_id",
                "params": {
                    "game_ids": [game_id]
                },
                "stamp": {
                    "agent_client_language": lang
                }
            };
            $.ajax({
                url: "https://www.wegame.com.cn/api/rail/web/data_filter/game_config/query",
                data: JSON.stringify(op),
                type: "POST",
                xhrFields: {withCredentials:true},
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                timeout: 5000
            })
            .done(function(res) {
                try {
                    if (res.result.error_code == 0) {
                        var config = res.items[0];
                        if (config == null) {
                            resolve({});
                            return;
                        }
                        resolve({
                            anti_cheat_type: config.anti_cheat_type
                        });
                        return;
                    }
                    resolve({});
                } catch (e) {
                    resolve({});
                }
            })
            .fail(function(err) {
                resolve({});
            });
        }
    });
}

function getCrossGameConfig(game_id, lang) {
    return new Promise(function(resolve, reject) {
        if (railSettingView.info.client_mode == 2) {
            resolve({});
        } else {
            var op = {
                "data_names": "cross_game_config_wg",
                "command": "by_game_id",
                "params": {
                    "game_ids": [game_id]
                },
                "stamp": {
                    "agent_client_language": lang
                }
            };
            $.ajax({
                url: "https://www.wegame.com.cn/api/rail/web/data_filter/game_config/query",
                data: JSON.stringify(op),
                type: "POST",
                xhrFields: {withCredentials:true},
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                timeout: 5000
            })
            .done(function(res) {
                try {
                    if (res.result.error_code == 0) {
                        var cross_config = res.items[0];
                        if (cross_config == null) {
                            resolve({});
                            return;
                        }
                        var cross_switch = cross_config.cross_switch;
                        if (typeof cross_switch == "string") {
                            cross_switch = JSON.parse(cross_switch);
                        }
                        var enable_cross = cross_switch.enable_cross;
                        var enable_friend = false;
                        var app_list = cross_config.app_list;
                        if (typeof app_list == "string") {
                            app_list = JSON.parse(app_list);
                        }
                        app_list = app_list.app_list;
                        for (var i = 0; i < app_list.length; i++) {
                            if (app_list[i].id == 10002) {
                                enable_friend = true;
                                break;
                            }
                        }
                        resolve({
                            enable_cross: enable_cross,
                            enable_friend: enable_friend
                        });
                        return;
                    }
                    resolve({});
                } catch (e) {
                    resolve({});
                }
            })
            .fail(function(err) {
                resolve({});
            });
        }
    });
}

function getGameNickname(game_id) {
    return new Promise(function(resolve, reject) {
        if (railSettingView.info.client_mode == 2) {
            resolve({});
        } else {
            var op = {
                "gameid": game_id,
                "reqfrom": "rail"
            };
            $.ajax({
                url: "https://www.wegame.com.cn/api/forum/lua/wg_game_user/get_game_nick",
                data: op,
                type: "GET",
                xhrFields: {withCredentials:true},
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                timeout: 5000
            })
            .done(function(res) {
                try {
                    resolve(res);
                } catch (e) {
                    resolve({});
                }
            })
            .fail(function(err) {
                resolve({});
            });
        }
    });
}

function checkNickname(game_id, nickname) {
    return new Promise(function(resolve, reject) {
        var op = {
            "gameid": game_id,
            "nick": nickname,
            "reqfrom": "rail"
        };
        $.ajax({
            url: "https://www.wegame.com.cn/api/forum/lua/wg_game_user/is_can_modify",
            data: op,
            type: "GET",
            xhrFields: {withCredentials:true},
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            timeout: 5000
        })
        .done(function(res) {
            try {
                resolve(res);
            } catch (e) {
                resolve({});
            }
        })
        .fail(function(err) {
            resolve({});
        });
    });
}

function getNicknameBindCfg(game_id, lang) {
    return new Promise(function(resolve, reject) {
        if (railSettingView.info.client_mode == 2) {
            resolve({});
        } else {
            var op = {
                "data_names": "game_nickname_bind_cfg",
                "command": "list_all",
                "params": {
                    "start_page": 0,
                    "items_per_pager": 20
                },
                "stamp": {
                    "agent_client_language": lang
                }
            };
            $.ajax({
                url: "https://www.wegame.com.cn/api/rail/web/data_filter/game_config/query",
                data: JSON.stringify(op),
                type: "POST",
                xhrFields: {withCredentials:true},
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                timeout: 5000
            })
            .done(function(res) {
                try {
                    if (res.result.error_code == 0) {
                        var config = res.items;
                        if (config == null) {
                            resolve({});
                            return;
                        }
                        var cfg = null;
                        for (var i = 0; i <config.length; i++) {
                            var sub_gamelist = JSON.parse(config[i].sub_gameid_list);
                            for (var j = 0; j < sub_gamelist.length; j++) {
                                if (sub_gamelist[j].game_id == game_id) {
                                    cfg = {
                                        relate_gameid: config[i].platform_gameid,
                                        main_title: config[i].main_title,
                                        sub_title: config[i].sub_title,
                                        enable_modify_relate_nickename: config[i].enable_modify_platform_nickname
                                    }
                                    break;
                                }
                            }
                            if (cfg != null) {
                                break;
                            }
                        }
                        resolve(cfg || {});
                        return;
                    }
                    resolve({});
                } catch (e) {
                    resolve({});
                }
            })
            .fail(function(err) {
                resolve({});
            });
        }
    });
}

function isNicknameContainSpecialChar( s ) {      
    var rule = RegExp(/^[\u4E00-\u9FA5A-Za-z0-9(\_)]+$/);
    return !( rule.test(s) );      
}

var tabOffset = [];

function showSubView(target, visible) {
    var index = 0;
    if (document.getElementById(target)) {
        index = $("#"+target).index();
    }

    var tabs = $("#config-page .mod");
    if (visible) {
        $(tabs[index]).removeClass("hide");
    } else {
        $(tabs[index]).addClass("hide");
    }
}

function getLimitSubStr(str, limit_size, charset) {    
    var total = 0,
        charCode,
        i,
        len;
    charset = charset ? charset.toLowerCase() : '';
    if (charset === 'utf-16' || charset === 'utf16') {
        for (i = 0, len = str.length; i < len; i++) {
            charCode = str.charCodeAt(i);
            if (charCode <= 0xffff) {
                total += 1;
            } else { 
                total += 2;
            }
            if (total > limit_size) {
                return str.substr(0, i);
            }
        }
        return str;
    } else {
        for (i = 0, len = str.length; i < len; i++) {
            charCode = str.charCodeAt(i);
            if (charCode <= 0x007f) {
                total += 1;
            } else if(charCode <= 0x07ff) {
                total += 1;
            } else if(charCode <= 0xffff) {
                total += 2;
            } else {
                total += 2;
            }
            if (total > limit_size) {
                return str.substr(0, i);
            }
        }
        return str;
    }
}  

var railSettingView = {
    info: {},
    lang: {},
    status: null,
    config: null,
    inited: false,
    prop_cloud: 1,
    branchInfo: {},
    curBranchId: -1,
    originalBranch: -1,
    isShowBranchSwitch: false,
    enable_cross: 1,
    enable_friend: true,
    show_debug_function: 0,
    show_cheat_test_mode_checkbox: 0,
    show_nickname: 0,
    original_nickname: "",
    is_nickname_auto_generate: false,
    last_success_nickname: "",
    relate_nickname_cfg: null,
    relate_nickname: "",
    is_relate_nickname_auto_generate: false,
    last_success_relate_nickname: "",
    check_nickname_before_save: false,
    nickname_checking_tasks: 0,
    init: function(info) {
        console.log(info);
        this.info = info;
        if (this.info.language == "en_US") {
            this.lang = lang_en;
        } else if(this.info.language == "zh_HK") {
            this.lang = lang_cht;
        } else {
            this.lang = lang_chs;
        }
        this.isShowBranchSwitch = info.is_show_branch_switch;
        if (info.client_mode == 2) {
            this.isShowBranchSwitch = false;
        }
        Promise.all([
            getGameDetailFromOss(this.info.game_id, this.info.language),
            getCrossGameConfig(this.info.game_id, this.info.language),
            getConsoleGameInfoFromOss(this.info.game_id, this.info.language),
            getNicknameBindCfg(this.info.game_id, this.info.language),
        ]).then(function(data) {
            if (data[0].enable_storage != null) {
                railSettingView.prop_cloud = data[0].enable_storage;
            }
            if (data[0].can_modify_nickname) {
                railSettingView.show_nickname = data[0].can_modify_nickname;
                console.log('show nickname', railSettingView.show_nickname);
            }
            if (data[1].enable_cross != null) {
                railSettingView.enable_cross = data[1].enable_cross;
            }
            if (data[1].enable_friend != null) {
                railSettingView.enable_friend = data[1].enable_friend;
            }
            if (data[2].anti_cheat_type != null && data[2].anti_cheat_type == "1") {
                railSettingView.show_debug_function = 1;
                railSettingView.show_cheat_test_mode_checkbox = 1;
            }
            railSettingView.relate_nickname_cfg = data[3];
            railSettingView.render();
            getBranchInfo();
        });
    },
    render: function() {
        vueCon = new Vue({
            el: "#rootEl",
            data: {
                lang: this.lang,
                showCloud: this.prop_cloud,
                branchInfo: this.branchInfo,
                isShowBranchSwitch: this.isShowBranchSwitch,
                enable_cross: this.enable_cross,
                enable_friend: this.enable_friend,
                version_name: this.info.version_name || "",
                build_id: this.info.build_id || "",
                version_id: this.info.version_id || "",
                show_debug_function: this.show_debug_function,
                show_cheat_test_mode_checkbox: this.show_cheat_test_mode_checkbox,
                show_nickname: this.show_nickname,
                nickname_error_msg: "",
                nickname_tips: this.lang.nickname_tips,
                nickname_addition_tips: "",
                has_nickname_error: false,
                relate_nickname_cfg: this.relate_nickname_cfg,
                relate_nickname_error_msg: "",
                relate_nickname_tips: this.lang.nickname_tips,
                relate_nickname_addition_tips: "",
                has_relate_nickname_error: false,
                is_installed: this.info.is_installed,
                get_config: this.config != null,
                client_mode: this.info.client_mode,
            },
            mounted: function() {
                if (this.relate_nickname_cfg.enable_modify_relate_nickename) {
                    getGameNickname(this.relate_nickname_cfg.relate_gameid).then((res) => {
                        if (res.result == 0) {
                            railSettingView.relate_nickname = res.user_info.game_nick;
                            railSettingView.is_relate_nickname_auto_generate = res.auto_flag == 1;
                        }
                        checkNickname(railSettingView.relate_nickname_cfg.relate_gameid, railSettingView.relate_nickname).then(function(res) {
                            if (res.result == nickname_errorcode["NickNameChangeTimeLimit"] || res.result == nickname_errorcode["NickNameServiceMaintain"]) {
                                // 当错误为修改时间未到时，将输入框禁用
                                vueCon.relate_nickname_error_msg = "";
                                if (res.result == nickname_errorcode["NickNameServiceMaintain"]) {
                                    vueCon.relate_nickname_tips = railSettingView.lang.nickname_service_maintain;
                                    if (railSettingView.is_relate_nickname_auto_generate) {
                                        vueCon.relate_nickname_addition_tips = railSettingView.lang.auto_generate_nickname_tips;
                                    }
                                } else {
                                    vueCon.relate_nickname_tips = res.errmsg;
                                }
                                $("#relate_nickname_editor").addClass("disabled").attr("disabled", true);
                            }
                        });
                        $("#relate_nickname_editor").val(railSettingView.relate_nickname).focus(function() {
                            // reset
                            vueCon.relate_nickname_error_msg = "";
                            vueCon.has_relate_nickname_error = false;
                            railSettingView.last_success_relate_nickname = "";
                        }).blur(function() {
                            var new_nickname = $(this).val();
                            if (new_nickname != "") {
                                if (isNicknameContainSpecialChar(new_nickname)) {
                                    vueCon.relate_nickname_error_msg = railSettingView.lang.nickname_error_format;
                                    vueCon.has_relate_nickname_error = true;
                                    return;
                                }
                                if (new_nickname == railSettingView.relate_nickname) {
                                    return;
                                }
                                railSettingView.nickname_checking_tasks++;
                                checkNickname(railSettingView.relate_nickname_cfg.relate_gameid, new_nickname).then(function(res) {
                                    if (res.result == 0) {
                                        vueCon.relate_nickname_error_msg = railSettingView.lang.nickname_available;
                                        railSettingView.last_success_relate_nickname = new_nickname;
                                    } else {
                                        if (res.result != nickname_errorcode["NickNameChangeTimeLimit"] && res.result != nickname_errorcode["NickNameServiceMaintain"]) {
                                            vueCon.has_relate_nickname_error = true;
                                            if (res.result == null) {
                                                vueCon.relate_nickname_error_msg = railSettingView.lang.check_nickname_failed;
                                            } else if (res.result == nickname_errorcode["NickNameNotUnique"]) {
                                                vueCon.relate_nickname_error_msg = railSettingView.lang.nickname_not_unique;
                                            } else if (res.result == nickname_errorcode["NickNameInvalidFormat"]) {
                                                vueCon.relate_nickname_error_msg = railSettingView.lang.nickname_error_format;
                                            } else if (res.result == nickname_errorcode["NickNameIllegal"]) {
                                                vueCon.relate_nickname_error_msg = railSettingView.lang.nickname_illegal;
                                            } else {
                                                vueCon.relate_nickname_error_msg = res.errmsg;
                                            }
                                        } else {
                                            // 当错误为修改时间未到时，将输入框禁用
                                            vueCon.relate_nickname_error_msg = "";
                                            if (res.result == nickname_errorcode["NickNameServiceMaintain"]) {
                                                vueCon.relate_nickname_tips = railSettingView.lang.nickname_service_maintain;
                                            } else {
                                                vueCon.relate_nickname_tips = res.errmsg;
                                            }
                                            $("#relate_nickname_editor").addClass("disabled").attr("disabled", true).val(railSettingView.relate_nickname);
                                        }
                                    }
                                    railSettingView.nickname_checking_tasks--;
                                    if (railSettingView.check_nickname_before_save && railSettingView.nickname_checking_tasks == 0) {
                                        railSettingView.check_nickname_before_save = false;
                                        SaveConfig();
                                    }
                                });
                            } else {
                                vueCon.relate_nickname_error_msg = railSettingView.lang.nickname_empty_tips;
                                vueCon.has_relate_nickname_error = true;
                            }
                        }).bind('keypress', function(event){
                            if (event.keyCode == "13") {
                                $(this).blur();
                            }
                        }).bind('input', function() {
                            var str = $(this).val();
                            var limit_str = getLimitSubStr(str, 16, 'utf8');
                            if (limit_str != str) {
                                $(this).val(limit_str);
                            }
                        });
                    });
                }
                
                $("#btn_set_default").click(function(){
                    railSettingView.SetDefault();
                });

                $("#btn_save").click(function(){
                    if (!$("#btn_save").hasClass("disabled")) {
                        reportClicked("save");
                        setTimeout(function() {
                            SaveConfig();
                        }, 200);
                    }
                });

                $("#btn_cancel").click(function(){
                    reportClicked("cancel");
                    setTimeout(function() {
                        Cancel();
                    }, 200);
                });
                $("#btn_close").click(function(){
                    Cancel();
                });
                if (railSettingView.info.is_installed) {
                    $("#btn_upload").click(function(){
                        UploadProfile();
                        reportClicked("upload_profile");
                    });
                    $("#btn_download").click(function(){
                        DownloadProfile();
                        reportClicked("download_profile");
                    });
                    $("#btn_open_directory").click(function() {
                        OpenDirectory();
                    });
                    $("#btn_uninstall_game").click(function() {
                        UninstallGame();
                    });
                }

                $("[type='checkbox'").click(function() {
                    var id = $(this).attr("id");
                    var state = $(this).attr("checked") ? "on" : "off";
                    reportClicked(id + '.' + state);
                });

                if (this.show_nickname == 1) {
                    getGameNickname(railSettingView.info.game_id).then(function(res) {
                        if (res.user_info) {
                            railSettingView.original_nickname = res.user_info.game_nick;
                        }
                        railSettingView.is_nickname_auto_generate = res.auto_flag == 1;
                        checkNickname(railSettingView.info.game_id, railSettingView.original_nickname).then(function(res) {
                            if (res.result == nickname_errorcode["NickNameChangeTimeLimit"] || res.result == nickname_errorcode["NickNameServiceMaintain"]) {
                                // 当错误为修改时间未到时，将输入框禁用
                                vueCon.nickname_error_msg = "";
                                if (res.result == nickname_errorcode["NickNameServiceMaintain"]) {
                                    vueCon.nickname_tips = railSettingView.lang.nickname_service_maintain;
                                    if (railSettingView.is_nickname_auto_generate) {
                                        vueCon.nickname_addition_tips = railSettingView.lang.auto_generate_nickname_tips;
                                    }
                                } else {
                                    vueCon.nickname_tips = res.errmsg;
                                }
                                $("#nickname_editor").addClass("disabled").attr("disabled", true);
                            }
                        });
                        $("#nickname_editor").val(railSettingView.original_nickname).focus(function() {
                            // reset
                            vueCon.nickname_error_msg = "";
                            vueCon.has_nickname_error = false;
                            railSettingView.last_success_nickname = "";
                        }).blur(function() {
                            var new_nickname = $(this).val();
                            if (new_nickname != "") {
                                if (isNicknameContainSpecialChar(new_nickname)) {
                                    vueCon.nickname_error_msg = railSettingView.lang.nickname_error_format;
                                    vueCon.has_nickname_error = true;
                                    return;
                                }
                                if (new_nickname == railSettingView.original_nickname) {
                                    return;
                                }
                                railSettingView.nickname_checking_tasks++;
                                checkNickname(railSettingView.info.game_id, new_nickname).then(function(res) {
                                    if (res.result == 0) {
                                        vueCon.nickname_error_msg = railSettingView.lang.nickname_available;
                                        railSettingView.last_success_nickname = new_nickname;
                                    } else {
                                        if (res.result != nickname_errorcode["NickNameChangeTimeLimit"] && res.result != nickname_errorcode["NickNameServiceMaintain"]) {
                                            vueCon.has_nickname_error = true;
                                            if (res.result == null) {
                                                vueCon.nickname_error_msg = railSettingView.lang.check_nickname_failed;
                                            } else if (res.result == nickname_errorcode["NickNameNotUnique"]) {
                                                vueCon.nickname_error_msg = railSettingView.lang.nickname_not_unique;
                                            } else if (res.result == nickname_errorcode["NickNameInvalidFormat"]) {
                                                vueCon.nickname_error_msg = railSettingView.lang.nickname_error_format;
                                            } else if (res.result == nickname_errorcode["NickNameIllegal"]) {
                                                vueCon.nickname_error_msg = railSettingView.lang.nickname_illegal;
                                            } else {
                                                vueCon.nickname_error_msg = res.errmsg;
                                            }
                                        } else {
                                            // 当错误为修改时间未到时，将输入框禁用
                                            vueCon.nickname_error_msg = "";
                                            if (res.result == nickname_errorcode["NickNameServiceMaintain"]) {
                                                vueCon.nickname_tips = railSettingView.lang.nickname_service_maintain;
                                            } else {
                                                vueCon.nickname_tips = res.errmsg;
                                            }
                                            $("#nickname_editor").addClass("disabled").attr("disabled", true).val(railSettingView.original_nickname);
                                        }
                                    }
                                    railSettingView.nickname_checking_tasks--;
                                    if (railSettingView.check_nickname_before_save && railSettingView.nickname_checking_tasks == 0) {
                                        railSettingView.check_nickname_before_save = false;
                                        SaveConfig();
                                    }
                                });
                            } else {
                                vueCon.nickname_error_msg = railSettingView.lang.nickname_empty_tips;
                                vueCon.has_nickname_error = true;
                            }
                        }).bind('keypress', function(event){
                            if (event.keyCode == "13") {
                                $(this).blur();
                            }
                        }).bind('input', function() {
                            var str = $(this).val();
                            var limit_str = getLimitSubStr(str, 16, 'utf8');
                            if (limit_str != str) {
                                $(this).val(limit_str);
                            }
                        });
                    });
                }

                RegEditEvent("#edit_friendlist");
                RegEditEvent("#edit_reply");
                RegEditEvent("#edit_inviter_accept");
                RegEditEvent("#edit_inviter_ignore");

                $(".set-tab li").click(function(e) {
                    var target = $(this).attr("id");
                    showSubView(current_tab, false);
                    showSubView(target, true);
                    SetCurSel(target);
                });
                $(".set-tab li:first").addClass("cur");
                current_tab = $(".set-tab li:first").attr("id");
                showSubView(current_tab, true);

                $('.popbox-hd').mousedown(function (event) {
                    if (event.target.tagName == 'A') {
                        return;
                    }
                    safe_callcpp('start_drag', '');
                });

                if (railSettingView.config != null) {
                    railSettingView.SetUI(railSettingView.config);
                }
                railSettingView.inited = true;
                if (railSettingView.info.sub_page) {
                    this.$nextTick(function() {
                        showSubView(current_tab, false);
                        showSubView(railSettingView.info.sub_page, true);
                        SetCurSel(railSettingView.info.sub_page);
                    });
                }
            },
            updated : function() {
                 $(".dropdown-toggle").unbind().click(function(){
                    $(this).closest(".tui-select").addClass("open");
                });
                $(".tui-select").unbind().mouseleave(function(){
                    $(this).removeClass("open");
                }).on('click', 'li', function(){
                    $(".tui-select").removeClass("open");
                });
                
                $(".set-tab li").unbind().click(function(e) {
                    var target = $(this).attr("id");
                    showSubView(current_tab, false);
                    showSubView(target, true);
                    SetCurSel(target);
                });
            },
            methods: {
                getBranchName : function() {
                    for(var i = 0; i < this.branchInfo.info.length; i++) {
                        var item = this.branchInfo.info[i];
                        if(item.branch_id == this.branchInfo.cur_branch_id) {
                            Vue.set(this.branchInfo, "cur_branch_name", item.app_name);
                            this.branchInfo.cur_branch_status = item.status;
                            break;
                        }
                    }
                },
                switchBranch : function(item) {
                    if(item.status < 0) {
                        return;
                    }
                    railSettingView.curBranchId = item.branch_id;
                    this.branchInfo.cur_branch_id = item.branch_id;
                    this.getBranchName();
                    var branch_item = JSON.stringify(item);
                    safe_callcpp('jc_switch_branch', branch_item);
                }
            },
            computed: {
                curBranchName: function() {
                    return this.branchInfo.cur_branch_name == "" || this.branchInfo.cur_branch_name == "release" ?  this.lang.no_test : this.branchInfo.cur_branch_name;
                },
                versionInfo: function() {
                    if (this.version_name != "") {
                        var text = this.lang.version_prefix + this.version_name;
                        if (this.build_id != "" && this.build_id != "0") {
                            text += "(" + this.build_id + ")";
                        } else if (this.version_id != "") {
                            text += "(" + this.version_id + ")";
                        }
                        return text;
                    } else {
                        return this.lang.version_prefix + this.version_id;
                    }
                }
            }

        });
        reportClicked('tab_crossswitch');
    },
    SetUI: function(json_param) {
        if (vueCon) {
            vueCon.get_config = true;
        }
        console.log('SetUI, json_param=' + JSON.stringify(json_param));
        var hotkey_friendlist = "";
        var hotkey_reply = "";
        var hotkey_inviter_accept = "";
        var hotkey_inviter_ignore = "";
        if (this.enable_cross && json_param.hasOwnProperty("show_cross")) {
            if (json_param.show_cross != 0) {
                document.getElementById("checkbox_show_cross").checked = true;
            } else {
                document.getElementById("checkbox_show_cross").checked = false;
            }
            var enable_snapshot_cross = snapshot_cross_default;
            if (json_param.hasOwnProperty("snapshot_cross")) {
                enable_snapshot_cross = json_param.snapshot_cross;
            }
            document.getElementById("checkbox_snapshot_cross").checked = (enable_snapshot_cross == 0)
        }
        if (this.enable_cross && this.enable_friend) {
            if (json_param.hasOwnProperty("hotkey")) {
                var hotkey = json_param.hotkey;
                if (hotkey.hasOwnProperty("friendlist")) {
                    var val = "";
                    if (hotkey.friendlist != 0) {
                        val = hotkey.friendlist;
                    }

                    hotkey_friendlist = code_to_hotkey_transfer(val);
                }
                if (hotkey.hasOwnProperty("reply")) {
                    var val = "";
                    if (hotkey.reply != 0) {
                        val = hotkey.reply;
                    }
                    hotkey_reply = code_to_hotkey_transfer(val);
                }
                if (hotkey.hasOwnProperty("inviter_accept")) {
                    var val = "";
                    if (hotkey.inviter_accept != 0) {
                        val = hotkey.inviter_accept;
                    }
                    hotkey_inviter_accept = code_to_hotkey_transfer(val);
                }
                if (hotkey.hasOwnProperty("inviter_ignore")) {
                    var val = "";
                    if (hotkey.inviter_ignore != 0) {
                        val = hotkey.inviter_ignore;
                    }
                    hotkey_inviter_ignore = code_to_hotkey_transfer(val);
                }
            }
            if (hotkey_friendlist == "") {
                hotkey_friendlist = GetDefaultHotkey("#edit_friendlist");
            }
            $("#edit_friendlist").attr("value", hotkey_friendlist);
            if (hotkey_reply == "") {
                hotkey_reply = GetDefaultHotkey("#edit_reply");
            }
            $("#edit_reply").attr("value", hotkey_reply);
            if (hotkey_inviter_accept == "") {
                hotkey_inviter_accept = GetDefaultHotkey("#edit_inviter_accept");
            }
            $("#edit_inviter_accept").attr("value", hotkey_inviter_accept);
            if (hotkey_inviter_ignore == "") {
                hotkey_inviter_ignore = GetDefaultHotkey("#edit_inviter_ignore");
            }
            $("#edit_inviter_ignore").attr("value", hotkey_inviter_ignore);
            
            CheckConflict("#edit_friendlist");
            CheckConflict("#edit_reply");
            CheckConflict("#edit_inviter_accept");
            CheckConflict("#edit_inviter_ignore");

            if (json_param.hasOwnProperty("switcher")) {
                var switcher = json_param.switcher;
                if (switcher.hasOwnProperty("icon") && switcher.icon != 0) {
                    document.getElementById("checkbox_icon").checked = true;
                } else {
                    document.getElementById("checkbox_icon").checked = false;
                }
                if (switcher.hasOwnProperty("msg") && switcher.msg != 0) {
                    document.getElementById("checkbox_msg").checked = true;
                } else {
                    document.getElementById("checkbox_msg").checked = false;
                }
                if (switcher.hasOwnProperty("state") && switcher.state != 0) {
                    document.getElementById("checkbox_state").checked = true;
                } else {
                    document.getElementById("checkbox_state").checked = false;
                }
                if (switcher.hasOwnProperty("inviter") && switcher.inviter != 0) {
                    document.getElementById("checkbox_inviter").checked = true;
                } else {
                    document.getElementById("checkbox_inviter").checked = false;
                }
                if (switcher.hasOwnProperty("add_friend") && switcher.add_friend != 0) {
                    document.getElementById("checkbox_add_friend").checked = true;
                } else {
                    document.getElementById("checkbox_add_friend").checked = false;
                }
            }
        }

        if (this.prop_cloud && json_param.hasOwnProperty("profile")) {
            var profile = json_param.profile;
            var auto_sync = true;
            if (profile.hasOwnProperty("auto_sync")) {
                auto_sync = (profile.auto_sync != 0) ? true : false;
            } else {
                auto_sync = auto_sync_default;
            }
            if (auto_sync) {
                document.getElementById("checkbox_auto_sync_profile").checked = true;
            } else {
                document.getElementById("checkbox_auto_sync_profile").checked = false;
            }
        }

        if (json_param.hasOwnProperty("game")) {
            var game = json_param.game;
            var auto_update;
            if (game.hasOwnProperty("auto_update")) {
                auto_update = (game.auto_update != 0) ? true : false;
            } else {
                auto_update = auto_update_default;
            }
            if (auto_update) {
                document.getElementById("checkbox_auto_update").checked = true;
            } else {
                document.getElementById("checkbox_auto_update").checked = false;
            }
        }

        // 离线模式禁用手动同步按钮
        // if (this.prop_cloud && json_param.hasOwnProperty("client_mode")) {
        //     var client_mode = json_param.client_mode;

        //     if (client_mode == 2) {  // offline
        //         $("#btn_download").addClass("disabled");
        //         $("#btn_upload").addClass("disabled");
        //     }
        // }

        if (json_param.hasOwnProperty("client_custom_cmd")) {
            var client_custom_cmd = json_param.client_custom_cmd;
            $("#edit_command").val(client_custom_cmd);
        }

        if (json_param.hasOwnProperty("cheat_test_mode")) {
            var cheat_test_checkbox = document.getElementById("checkbox_cheat_test_mode");
            if (cheat_test_checkbox != null) {
                cheat_test_checkbox.checked = json_param.cheat_test_mode != 0;
            }
        }

        if (json_param.hasOwnProperty("is_dev_client")) {
            if (json_param.is_dev_client == 0 || railSettingView.show_debug_function == 0) {
                $('#tab_debug_function').addClass('hide');
            } else {
                $('#tab_debug_function').removeClass('hide');
            }
        }
    },
    SetDefault: function() {
        var json_param = GetDefaultConfig();
        this.SetUI(json_param);
    },
    GetUIConfig: function() {
        var json_param = {};
        if (this.enable_cross) {
            json_param.show_cross = document.getElementById("checkbox_show_cross").checked ? 1 : 0;
            json_param.snapshot_cross = 
                document.getElementById("checkbox_snapshot_cross").checked ? 0 : 1;
        }
        if (this.enable_cross && this.enable_friend) {
            var hotkey = {};
            hotkey.friendlist = hotkey_to_code_transfer($("#edit_friendlist").val());
            hotkey.reply = hotkey_to_code_transfer( $("#edit_reply").val());
            hotkey.inviter_accept = hotkey_to_code_transfer( $("#edit_inviter_accept").val());
            hotkey.inviter_ignore = hotkey_to_code_transfer( $("#edit_inviter_ignore").val());
            json_param["hotkey"] = hotkey;

            var switcher = {};
            switcher.icon = document.getElementById("checkbox_icon").checked ? 1 : 0;
            switcher.msg = document.getElementById("checkbox_msg").checked ? 1 : 0;
            switcher.state = document.getElementById("checkbox_state").checked ? 1 : 0;
            switcher.inviter = document.getElementById("checkbox_inviter").checked ? 1 : 0;
            switcher.add_friend = document.getElementById("checkbox_add_friend").checked ? 1 : 0;
            json_param["switcher"] = switcher;
        }

        if (this.prop_cloud) {
            var profile = {};
            profile.auto_sync = document.getElementById("checkbox_auto_sync_profile").checked ? 1 : 0;
            json_param["profile"] = profile;
        }

        var game = {};
        game.auto_update = document.getElementById("checkbox_auto_update").checked ? 1 : 0;
        json_param["game"] = game;

        json_param.client_custom_cmd = $("#edit_command").val();
        
        var cheat_test_checkbox = document.getElementById("checkbox_cheat_test_mode");
        if (cheat_test_checkbox != null) {
            json_param.cheat_test_mode = cheat_test_checkbox.checked ? 1 : 0;
        }
        if (this.show_nickname == 1) {
            var nickname_config = {};
            nickname_config["original_nickname"] = this.original_nickname;
            nickname_config["new_nickname"] = $("#nickname_editor").val();
            json_param.nickname = nickname_config;
        }
        if (this.relate_nickname_cfg.enable_modify_relate_nickename == 1) {
            var relate_nickname = {
                original_relate_nickname: this.relate_nickname,
                new_relate_nickname: $("#relate_nickname_editor").val(),
                relate_gameid: this.relate_nickname_cfg.relate_gameid,
            }
            json_param.relate_nickname = relate_nickname;
        }

        return json_param;
    },
    SetBrachInfo: function(json_param) {
        var branchInfo = json_param;
        if (branchInfo.info == null) {
            branchInfo.info = [];
        }
        if (!railSettingView.info.is_installed) {
            branchInfo.cur_branch_id = 0;
        }
		for(var i = 0; i < branchInfo.info.length; i++) {
			if(branchInfo.info[i].branch_id == 1) {
                branchInfo.info[i].app_name = this.lang.no_test;
			} else {
                branchInfo.info[i].app_name = branchInfo.info[i].app_name + " - " + this.lang.test_ver;
			}		
		}
        vueCon.branchInfo = branchInfo;
        railSettingView.originalBranch = branchInfo.cur_branch_id;
        vueCon.getBranchName();
    },
    showPswPop : function(json_param) {
        var checkRet = json_param;
        if(!checkRet.check_ret) {
            var pswContainer = $('#pswInputCon');
            pswContainer.removeClass('hide');
            $('.tui-mask').removeClass('hide')
            pswContainer.find('input').val('');
            pswContainer.find('.error-tips').removeClass('hide').addClass('hide');
            pswContainer.find('.btn-close').unbind().click(function() {
                $('.tui-mask').addClass('hide')
                pswContainer.addClass('hide');
                railSettingView.backToOrigin();
            });
            $('#submitPsw').unbind().click(function() {
                var item = {
                    "token" : $('#pswInputCon').find('input').val(),
                    "branch_id" : railSettingView.curBranchId
                }
                var branch_item = JSON.stringify(item);
                safe_callcpp('jc_check_branch_new_psw', branch_item);
                return false;
            });
            $('#cancelPsw').unbind().click(function() {
                pswContainer.addClass('hide');
                $('.tui-mask').addClass('hide')
                railSettingView.backToOrigin();
            });
        }
    },
    showPswCheck : function(json_param) {
        var checkRet = json_param;
        if(!checkRet.check_ret) {
            $('#pswInputCon').find('.error-tips').removeClass('hide');
        } else {
            $('.tui-mask').addClass('hide')
            $('#pswInputCon').addClass('hide');
            $('#pswSuccCon').removeClass('hide');
            $('#pswSuccCon').find('.btn-primary').unbind().click(function() {
                $('#pswSuccCon').addClass('hide');
            });
            $('#pswSuccCon').find('.btn-close').unbind().click(function() {
                $('#pswSuccCon').addClass('hide');
            });

        }
    },
    backToOrigin : function() {
        railSettingView.curBranchId = railSettingView.originalBranch;
        vueCon.branchInfo.cur_branch_id = railSettingView.originalBranch;
        vueCon.getBranchName();
        safe_callcpp('jc_cancel_branch_switch', '');
    },
    showBranchSwitch : function(ret) {
        if (this.info.client_mode != 2) {
            vueCon.isShowBranchSwitch = ret;
        }
        /*if(ret) {
            $('#branchSwitch').find('.tui-select').removeClass('disabled')
        } else {
            $('#branchSwitch').find('.tui-select').addClass('disabled')
        }*/
    }
};

function on_hostapp_callback(callback_name, json_param) {
    var pkg = jQuery.parseJSON(json_param);
    if (callback_name == "cj_set_info" && railSettingView.config == null) {
        var game_id = pkg.game_id;
        if (game_id != railSettingView.info.game_id) {
            return;
        }
        var json_config;
        if (pkg.game_property == "") {
            json_config = GetDefaultConfig();
        } else {
            json_config = jQuery.parseJSON(pkg.game_property);
            if (json_config.hasOwnProperty("profile")) {
                var profile = json_config.profile;
                if (profile.hasOwnProperty("auto_sync_default")) {
                    auto_sync_default = (profile.auto_sync_default != 0) ? true : false;
                }
            }
            if (json_config.hasOwnProperty("game")) {
                var game = json_config.game;
                if (game.hasOwnProperty("auto_update_default")) {
                    auto_update_default = (game.auto_update_default != 0) ? true : false;
                }
            }
            if (json_config.hasOwnProperty("auto_show_cross_default")) {
                auto_show_cross_default = json_config.auto_show_cross_default;
            }
            if (!json_config.hasOwnProperty("show_cross")) {
                json_config.show_cross = auto_show_cross_default;
            }
        }
        railSettingView.config = json_config;
        if (railSettingView.inited) {
            railSettingView.SetUI(json_config);
        }
    } else if (callback_name == "cj_client_info") {
        railSettingView.init(pkg);
    } else if (callback_name == "cj_set_branch_info") {
        if (railSettingView.inited) {
            railSettingView.SetBrachInfo(pkg);
        }
    } else if (callback_name == "cj_get_password") {
        railSettingView.showPswPop(pkg);
    } else if (callback_name == "cj_check_new_psw") {
        railSettingView.showPswCheck(pkg);
    } else if(callback_name == "cj_is_show_branch_switch") {
        if (pkg["game_id"] == railSettingView.info.game_id) {
            railSettingView.showBranchSwitch(pkg["is_show_branch_switch"]);
        }
    };
}

(function() {
    getClientInfo();
    queryCrossConfig();
})();
