var request = require('request')
    , fs = require("fs");


function scraper(){
    var me = {
        data : [],
        queries : 0,
        processed : 0
    };

    function getStatesArr(){
        var i, len, lst1, lst2, obj, arr = [],
            statesText = fs.readFileSync("states.txt", "utf-8").split("\n");

        len = statesText.length;
        for (i = 0; i < len; i += 1){

            lst1 = statesText[i].split('">');
            obj = {
                id:lst1[0]
            };
            lst2 = lst1[1].split(" - ");
            obj.name = lst2[0];
            obj.symb = lst2[1];
            arr.push(obj);
        }
        return arr;
    }

    function getSecondBigTable(text){
        var big = '<TABLE class="big_table">',
            lenBig = big.length,
            i = text.indexOf(big),
            s = text.substring(i+lenBig),
            j;

        i = s.indexOf(big);
        s = s.substring(i);
        j = s.indexOf('</TABLE>');
        s = s.substring(0,j+'</TABLE>'.length);
        return s;
    }

    function replaceAll(find, replace, str) {
        return str.replace(new RegExp(find, 'g'), replace);
    }


//    function getJson(lst){
//        var obj = {};
//        obj.LocalityName = lst[0];
//        obj.MetropolitanAreaName = lst[1].substring(3);
//        obj.Efficiency = lst[2].substring(2);
//        obj.OneBedroom = lst[3].substring(2);
//        obj.TwoBedroom = lst[4].substring(2);
//        obj.ThreeBedroom = lst[5].substring(2);
//        obj.FourBedroom = lst[6].substring(2);
//        obj.FMRPercentile = lst[7].substring(1);
//        return obj;
//    }

    function trimArr(lst){
        return lst.map(function(item){
            return item.trim();
        });
    }

    function getColumn(text){
        var system = '2014 FMR Documentation System>',
            s = text,
            i = s.indexOf(system),
            obj, lst, lstStripped,
            replaceList = ['</TR>','<TD scope="row" >','<TD >','</A>','</TD>','</TH>','<TD >','\t','<EM>','</EM>','<em>','</em>'];

        s = s.substring(i+system.length);
        for (i = 0; i < replaceList.length; i +=1){
            s = replaceAll(replaceList[i],'',s);
        }
        lst = s.split('\r\n');
        if (lst.length === 1){
            lst = s.split('\n');
        }
        lst = trimArr(lst);
        lstStripped = lst.filter(function(item){
            return item !== "";
        });
        obj = lstStripped;

        console.log(obj);
        return obj;
    }

    function getRow(text){
        var obj = {
                json : {},
                text : ""
            },
            i = text.indexOf("<TR>"),
            j, s;

        s = text.substring(i+"<TR>".length);
        j = s.indexOf("</TR>");
        obj.text = s.substring(j+"</TR>".length);
        s = s.substring(0,j);
        obj.json = getColumn(s);
        return obj;

    }

    function getAllRows(text){
        var obj, arr = [];
        while (text.length > 0){
            obj = getRow(text);
            text = obj.text;
            arr.push(obj.json);
            while ((text.length > 0)&&(text[0] === ' ')){
                text = text.substring(1);
            }
            if (text.length < 10){
                text = "";
            }
        }
        console.log(arr.length);
        return arr;
    }

    function getAllRowsText(text){
        var i = text.indexOf('</THEAD>'),
            j, s;

        s = text.substring(i+'</THEAD>'.length);
        j = s.indexOf('</TABLE>');
        return getAllRows(s.substring(0,j));
    }

    function checkComplete(){
        me.processed += 1;
        if (me.processed === me.queries){
            fs.writeFile("fmr.json.arr", JSON.stringify(me.data), function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log("The file was saved!");
                }
            });
        }

    }

    function saveFile(state, body){
        fs.writeFile("./states/"+state+".html", body, function(err) {
            if(err) {
                console.log(err);
            } else {
                console.log("The file for " + state + " was saved!");
            }
        });
    }

    function asyncCreator(state){
        return function(e, r, body){
            var s = getSecondBigTable(body),
                data = getAllRowsText(s.trim());

            data.forEach(function(item){
                if (item.Efficiency === undefined){
                    //then it is an array
                    item.push(state);
                }
                else{
                    item.state = state;
                }

                me.data.push(item);
            });
            //saveFile(state, body);

            checkComplete();
        }

    }

    function main(states){
        var state, i, id,
            base_url = "http://www.huduser.org/portal/datasets/fmr/fmrs/FY2014_code/2014state_summary.odn",
            data = {
                inputname:"STTLT*0199999999+Alabama",
                selection_type:"county",
                stname:"Alabama",
                statefp:"01.0",
                year:2014,
                data:2014,
                fmrtype:"Final",
                action:"select_Geography.odn"
            };

        for (i = 0; i < states.length; i+=1){
            state = states[i];
            id = state.id;
            data.statefp = id;
            data.stname = state.name;
            if (id == 9 || id==23||id==25||id==33||id==44||id==50){
                data.ne_flag = 1;
            }
            else{
                data.ne_flag=0;
            }
            me.queries += 1;
            request.post(
                {
                    url: base_url,
                    form: data

                },
                asyncCreator(state.symb)
            )
        }

    }

//    function processOneState(state){
//        var fileName = "./states/"+state + ".html",
//            body = fs.readFileSync(fileName, "utf-8"),
//            s = getSecondBigTable(body),
//            data = getAllRowsText(s.trim());
//
//        data.forEach(function(item){
//            if (item.Efficiency === undefined){
//                //then it is an array
//                item.push(state);
//            }
//            else{
//                item.state = state;
//            }
//
//            me.data.push(item);
//        });
//    }

    var states = getStatesArr();
    main(states);

    //processOneState('AL');
//    var sample = ['<TR>',
//        '<TH scope="row" ><A HREF="2014summary.odn?inputname=METRO33100MM2680*Broward County&county_select=yes&year=2014&fmrtype=Final&state_name=$state_name$&statefp=12.0&path=&incpath=" TARGET=2014 FMR Documentation System>Broward County, FL</A></TH>',
//    '<TD scope="row" ><em>Fort Lauderdale, FL HUD Metro FMR Area</em></A></TD>',
//    '        ',
//    '          ',
//    '<TD >$762</TD>',
//    '    <TD >$992</TD>',
//    '<TD >$1,260</TD>',
//    '    <TD >$1,797</TD>',
//    '<TD >$2,232</TD>',
//    '    <TD >50</TD>',
//    '</TR>'].join("\n");
//    getColumn(sample);

}


if(typeof(String.prototype.trim) === "undefined")
{
    String.prototype.trim = function()
    {
        return String(this).replace(/^\s+|\s+$/g, '');
    };
}



scraper();


