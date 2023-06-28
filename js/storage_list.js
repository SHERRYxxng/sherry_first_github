var version_id_          = -1;
var version_str_         = "";
var delete_version_str_  = "";
var preview_clickable_   = false;
var preview_real_height_ = 0;
var preview_real_width_  = 0;

(function ($) {
    $.getUrlParam = function (name) {
        var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
        var r = window.location.search.substr(1).match(reg);
        if (r != null) return unescape(r[2]); return null;
    }
})(jQuery);

$(document).ready(function() {
    console.log("on ready", $.getUrlParam('language'));
    railProfileView.init($.getUrlParam('language'));
    $("body").show();
});

function reset_param() {
    console.log("reset_param");
    version_id_         = -1;
    version_str_        = "";
    delete_version_str_ = "";
    preview_clickable_  = false;
    preview_real_height_ = 0;
    preview_real_width_  = 0;
}

function set_selected_version(version_id, version_str, preview_url, obj) {
    if (version_str_ == version_str || version_str == delete_version_str_) {
        return;
    }

    console.log("set_selected_version: version " + version_str);
    console.log("set_selected_version: url" + preview_url);
    version_id_ = version_id;
    version_str_ = version_str;
    preview_clickable_ = false;

    $(obj).css({ 'background-color': '#EBEBEB', 'font-weight': 'bold' });
    $(obj).siblings().css({ 'background-color': '#FFFFFF', 'color': '#757575' });
    $("#previewImg").attr("src", "images/load_failed.png");
    $("#previewLabel").hide();
    $('#previewVideo').hide();
    $("#previewVideo").attr("src", "");


    var type = preview_url.substring(preview_url.lastIndexOf('.') + 1);
    if (type == "gif") {
        var img = new Image();
        img.onload = function() {
            $("#previewImg").attr("src", preview_url);
            preview_clickable_ = true;
        };
        img.onerror = function() {
            preview_clickable_ = false;
        };
        img.src = preview_url;
    } else if (type == "mp4") {
        var video = document.createElement('VIDEO');
        video.onloadeddata = function() {
            $("#previewVideo").attr("src", preview_url);
            $('#previewVideo').show();
            preview_clickable_ = true;
        };
        video.onerror = function() {
            preview_clickable_ = false;
        };
        video.src = preview_url;
    } else {
        $("#previewImg").attr("src", "images/no_preview.png");
        $("#previewLabel").show();
    }
}

function delete_selected_version(version_id, version_str, obj) {
    // step1：remove selected version from list
    console.log("delete_selected_version: " + version_str + " class: " + $(obj).parent().parent().parent().attr('class'));
    delete_version_str_ = version_str;

    var table_tbody = $(obj).parent().parent().parent().parent();
    $('.' + $(obj).parent().parent().parent().attr('class')).remove();
    $(table_tbody).find("tr:eq(0)").trigger("click");

    // step2：notify rail to delete selected version
    var delete_profile = {};
    delete_profile.version_str = version_str;
    delete_profile.version_id = version_id;
    var json_str = JSON.stringify(delete_profile);
    safe_callcpp('delete_selected_profile', json_str);
}

function show_big_preview_img(outerDiv, innerDiv, bigImg, _this) {
    $("#bigVideo").hide();
    $("#bigImg").show();
    var src = _this.attr("src");
    $(bigImg).attr("src", src);

    $("<img/>").attr("src", src).load(function(){
        var windowW = $(window).width();
        var windowH = $(window).height();
        var realWidth = this.width;
        var realHeight = this.height;
        var imgWidth, imgHeight;
        var scale = 0.9;

        if(realHeight>windowH*scale) {
            imgHeight = windowH*scale;
            imgWidth = imgHeight/realHeight*realWidth;
            if(imgWidth>windowW*scale) {
                imgWidth = windowW*scale;
            }
        } else if(realWidth>windowW*scale) {
            imgWidth = windowW*scale;
            imgHeight = imgWidth/realWidth*realHeight;
        } else {
            imgHeight = windowH * 0.9;
            imgWidth = realWidth * imgHeight / realHeight;
        }
        $(bigImg).css("width",imgWidth);

        var w = (windowW-imgWidth)/2;
        var h = (windowH-imgHeight)/2;
        $(innerDiv).css({"top":h, "left":w});
        $(outerDiv).fadeIn("fast");
    });

    $(outerDiv).click(function() {
        $(this).fadeOut("fast");
    });
}

function show_big_preview_video(outerDiv, innerDiv, bigVideo, _this) {
    $("#bigImg").hide();
    $("#bigVideo").show();
    var src = _this.attr("src");
    $(bigVideo).attr("src", src);

    var windowW = $(window).width();
    var windowH = $(window).height();

    var imgWidth, imgHeight;
    var scale = 0.9;

    if(preview_real_height_ > windowH * scale) {
        imgHeight = windowH * scale;
        imgWidth = imgHeight / preview_real_height_ * preview_real_width_;
        if(imgWidth > windowW * scale) {
            imgWidth = windowW * scale;
        }
    } else if(preview_real_width_ > windowW * scale) {
        imgWidth = windowW * scale;
        imgHeight = imgWidth / preview_real_width_ * preview_real_height_;
    } else {
        imgHeight = windowH * 0.9;
        imgWidth = preview_real_width_ * imgHeight / preview_real_height_;
    }
    $(bigVideo).css("width", imgWidth);

    var w = (windowW-imgWidth)/2;
    var h = (windowH-imgHeight)/2;
    $(innerDiv).css({"top":h, "left":w});
    $(outerDiv).fadeIn("fast");

    $(outerDiv).click(function() {
        $(this).fadeOut("fast");
    });
}

function safe_callcpp(func, param) {
    try {
        window.external.callcpp(func, param);
    } catch (e) { }
}

function sync_selected_profile(click_cancel_ok) {
    console.log("sync selected profile version_id", version_id_);
    var revert_profile = {};
    revert_profile.version_str = version_str_;
    revert_profile.version_id = version_id_;
    revert_profile.is_cancel = (click_cancel_ok || version_id_ < 0) ? 1 : 0;
    var json_str = JSON.stringify(revert_profile);
    safe_callcpp('sync_selected_profile', json_str);
    version_id_ = 0;
}

var railProfileView = {
    lang: {},
    init: function (param_language) {
        if (param_language == "en_US") {
            this.lang = lang_en;
        } else if (param_language == "zh_HK") {
            this.lang = lang_cht;
        } else {
            this.lang = lang_chs;
        }
        railProfileView.render();
    },
    render: function () {
        vueCon = new Vue({
            el: "#rootEl",
            data: {
                lang: this.lang,
            },
            mounted: function () {
                console.log("mounted");
                $("#submitPsw").click(function () {
                    console.log("sync clicked");
                    sync_selected_profile(false);
                });

                $("#cancelPsw").click(function () {
                    console.log("cancel clicked");
                    sync_selected_profile(true);
                });

                $("#previewImg").click(function () {
                    if (preview_clickable_) {
                        console.log("previewImg clicked");
                        show_big_preview_img("#previewDiv", "#innerDiv", "#bigImg", $("#previewImg"));
                    }
                });

                $("#previewVideo").click(function () {
                    if (preview_clickable_) {
                        console.log("previewVideo clicked");
                        show_big_preview_video("#previewDiv", "#innerDiv", "#bigVideo", $("#previewVideo"));
                    }
                });

                $('#previewVideo').on('canplaythrough', function() {
                    preview_real_height_ = this.videoHeight;
                    preview_real_width_  = this.videoWidth;
                });

                $("#previewImg").hover(function () {
                    if (preview_clickable_) {
                        $("#previewImg").css('cursor', 'pointer');
                    } else {
                        $("#previewImg").css('cursor', 'default');
                    }
                }, function () {
                    $("#previewImg").css('cursor', 'default');
                });

                $("#previewVideo").hover(function () {
                    if (preview_clickable_) {
                        $("#previewVideo").css('cursor', 'pointer');
                    } else {
                        $("#previewVideo").css('cursor', 'default');
                    }
                }, function () {
                    $("#previewVideo").css('cursor', 'default');
                });

                $("input[type='radio']").change(function () {
                    $("#data_table").children().find("tbody").scrollTop(0);
                    if ($("#tab_all").prop('checked')) {
                        console.log("tab_all clicked");
                        version_id_ = -1;
                        $("#label_all").css({'font-weight':'bold', 'color':'#3c3c3c'});
                        $("#label_pc").css({'font-weight':'normal', 'color':'8c8c8c'});
                        $("#label_mobile").css({'font-weight':'normal', 'color':'8c8c8c'});
                        $("#table_all").show();
                        $("#table_all").siblings().hide();
                        $("#table_all tbody tr:eq(0)").trigger("click");
                    } else if ($("#tab_pc").prop('checked')) {
                        console.log("tab_pc clicked");
                        version_id_ = -1;
                        $("#label_all").css({'font-weight':'normal', 'color':'8c8c8c'});
                        $("#label_pc").css({'font-weight':'bold', 'color':'#3c3c3c'});
                        $("#label_mobile").css({'font-weight':'normal', 'color':'8c8c8c'});
                        $("#table_pc").show();
                        $("#table_pc").siblings().hide();
                        $("#table_pc tbody tr:eq(0)").trigger("click");
                    } else if ($("#tab_mobile").prop('checked')) {
                        console.log("tab_mobile clicked");
                        version_id_ = -1;
                        $("#label_all").css({'font-weight':'normal', 'color':'8c8c8c'});
                        $("#label_pc").css({'font-weight':'normal', 'color':'8c8c8c'});
                        $("#label_mobile").css({'font-weight':'bold', 'color':'#3c3c3c'});
                        $("#table_mobile").show();
                        $("#table_mobile").siblings().hide();
                        $("#table_mobile tbody tr:eq(0)").trigger("click");
                    }
                });
            }
        });
    },
    SetProfileListData: function (profile_list_param) {
        try {
            var json_obj = profile_list_param;
            reset_param();
            if (json_obj != null && json_obj.recent_profiles_size != null) {
                $("#table_all tbody").html("");
                $("#table_pc tbody").html("");
                $("#table_mobile tbody").html("");
                for (var i = 0; i < json_obj.recent_profiles_size; ++i) {
                    var profile = json_obj.recent_profiles[i];
                    if (profile != null) {
                        railProfileView.AddRow($("#table_all"),
                            profile.version_id,
                            profile.version_str,
                            profile.name,
                            profile.duration_str,
                            profile.device,
                            profile.preview_url,
                            profile.size);
                        if (profile.source == 0) {
                            // pc存档
                            railProfileView.AddRow($("#table_pc"),
                                profile.version_id,
                                profile.version_str,
                                profile.name,
                                profile.duration_str,
                                profile.device,
                                profile.preview_url,
                                profile.size);
                        } else if (profile.source == 1) {
                            // 移动端产生的存档
                            railProfileView.AddRow($("#table_mobile"),
                                profile.version_id,
                                profile.version_str,
                                profile.name,
                                profile.duration_str,
                                profile.device,
                                profile.preview_url,
                                profile.size);
                        }
                    }
                }

                if (json_obj.need_to_show_preview) {
                    $("#div_preview").css('width','250px');
                    $("#previewImg").css('width','250px');
                    $("#previewVideo").css('width', '250px');
                    $("#previewImg").attr("src", "images/load_failed.png");
                } else {
                    $("#previewLabel").html('');
                    $("#div_preview").css('width','0px');
                    $("#previewImg").css('width','0px');
                    $("#previewVideo").css('width', '0px');
                }
                if($("#table_mobile").children("tr").length == 0) {
                    $("#div_pc").hide();
                    $("#div_mobile").hide();
                } else {
                    $("#div_pc").show();
                    $("#div_mobile").show();
                }
                $("#table_all tbody tr:eq(0)").trigger("click");
            }
        } catch (e) {
            console.log("set_profile_list_data error");
        }
    },
    AddRow: function (obj, version_id, version_str, upload_time, duration, upload_device, preview_url, size) {
        var rowTem = `<tr class="${"version" + version_str.replace(/\./g,"")}"
            onclick="set_selected_version(${version_id} ,'${version_str}', '${preview_url}', this)">
            <td class="data_table_th01_class">${upload_time}</td>
            <td class="data_table_th02_class">${duration}</td>
            <td class="data_table_th03_class">${upload_device}</td>
            <td class="data_table_td04_class">
                <div style="position: relative;">
                    <span class="table_size_class">${size}</span>
                    <div class="table_delete_class"
                         style="visibility:hidden"
                         onclick="delete_selected_version(${version_id}, '${version_str}', this)">
                        <a class="btn btn-default btn-xs" style="position:absolute;left: 0;top: 0;">
                            <span>${this.lang.profile_delete}</span>
                        </a>
                    </div>
                </div>
            </td>
            </tr>`;
        $(obj).find("tbody:last").append(rowTem);
    },
    InitTableItemHoverEvent: function() {
        $(".data_table_td04_class").hover(function() {
            $(this).children("div:first-child").children(".table_size_class").css("visibility", "hidden");
            $(this).children("div:first-child").children(".table_delete_class").css("visibility", "visible");
        }, function() {
            $(this).children("div:first-child").children(".table_delete_class").css("visibility", "hidden");
            $(this).children("div:first-child").children(".table_size_class").css("visibility", "visible");
        });
    }
};

function on_hostapp_callback(callback_name, json_param) {
    console.log("callback_name:" + callback_name);
    console.log("json_param:" + json_param);
    var pkg = jQuery.parseJSON(json_param);

    if (callback_name == 'set_profile_list_data') {
        railProfileView.SetProfileListData(pkg);
        railProfileView.InitTableItemHoverEvent();
    } else if (callback_name == 'notify_delete_result') {
        console.log("notify_delete_result result: " + json_param);
    }
}