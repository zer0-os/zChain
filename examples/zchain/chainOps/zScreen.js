import blessed from 'blessed';
import contrib from 'blessed-contrib';
import fs from "fs";
import bigInt from "big-integer";


export class ZScreen {

	constructor(){
		this.screen = blessed.screen({smartCSR: true,autoPadding:true});
	        this.screen.title = "Zchain"
		this.screen.key(['escape',  'C-c'], function(ch, key) {return process.exit(0);});
		this.grid = new contrib.grid({rows: 12, cols: 12, screen: this.screen});
		this.choices = ["Profile","Verified nodes","Chat"]
		this.meowAsci = fs.readFileSync("meowAsci.txt")
		this.verifiedNodesList=blessed.list({});
		this.initStaticScreen()
		this.topicsBox = blessed.list({})
		this.topicChatForm = blessed.form({})
	}
	initStaticScreen(){
		this.mapBox = this.grid.set(6,0,6,6,contrib.map,{label:"Nodes map"});
		this.connectionsLogBox = this.grid.set(9,6,3,6,contrib.log,{fg:"green",selectedFg:"green",label:"Discovery and connections"});
		this.subscribedTopicsLog = this.grid.set(6,6,3,6,blessed.log,{fg:"green",selectedFg:"green",label:"Console logs"});
		this.choiceListBox = this.grid.set(0,0,6,2,blessed.list,{
			interactive:true,
			mouse: true,
			items:this.choices,
			selectedFg :"blue",
			selectedBg :"green",
			fg:"white",
			label:"Select a function"
		});
		this.logoBox = this.grid.set(0,8,6,4,blessed.text,{
			align:"left",
			fg : "green",
			content : this.meowAsci.toString()
		});
		this.drawProfileBox();

	}
	drawTopicChatBox(topicName){
		this.topicChatBox = this.grid.set(0,2,6,6,blessed.box,{
			keys:true,
                        label:topicName,
			name: topicName,
                        mouse:true
		});
		this.topicChatLogs = blessed.log({
			fg:"green",
			parent: this.topicChatBox,
			height:"70%",
		})
		this.topicChatNew = blessed.textbox({
                        parent:this.topicChatBox,
                        left:"5%",
                        inputOnFocus: true,
                        width:"70%",
                        top:"80%",
                        fg:"blue",
                        focus:{fg:"blue"},
                        border:{type:"line"},
                        shrink:true,
                        value:""
                });
                this.topicChatNew.on("click",function(){

                });

		this.submitTopicChatButton = blessed.button({
                        parent: this.topicChatBox,
                        mouse:true,
                        keys:true,
                        shrink:true,
                        content:"Send meow",
                        style: {bg: 'black',focus: {bg: 'blue'},hover: {bg: 'blue'},fg:"white"},
                        padding: {left: 1,right: 1},
                        left:"80%",
                        top:"85%"
                });

	}
	//topics Box
	drawTopicsBox(topics){
		this.topicsWrapper = this.grid.set(0,2,6,6,blessed.box,{label:"Topics dashboard"})
		this.topicsBox = blessed.list({
			parent:this.topicsWrapper,
                        mouse:true,
                        align:"center",
                        selectedFg:"blue",
                        selectedBg:"green",
                        fg:"white",
			height:"70%",
                        items:topics,
                        interactive:true,
			keys:true

		});
		this.topicCreateName = blessed.textbox({
                        parent:this.topicsWrapper,
                        left:"5%",
                        inputOnFocus: true,
                        width:"70%",
                        top:"80%",
                        fg:"blue",
                        focus:{fg:"blue"},
                        border:{type:"line"},
                        shrink:true,
                        value:""
                });
                this.topicCreateName.on("click",function(){

                });

                this.submitTopicCreateButton = blessed.button({
                        parent: this.topicsWrapper,
                        mouse:true,
                        keys:true,
                        shrink:true,
                        content:"Create topic",
                        style: {bg: 'black',focus: {bg: 'blue'},hover: {bg: 'blue'},fg:"white"},
                        padding: {left: 1,right: 1},
                        left:"80%",
                        top:"85%"
                });

	}
	//znas owned by a node
	drawOwnedZnasBox(ownedDomains){
		var formattedZnas=[]
		ownedDomains.forEach(zna=>{
			var lastIndexOfPoint = zna.name.lastIndexOf(".")
			formattedZnas.push([zna.name.substring(zna.name.indexOf(".")+1,lastIndexOfPoint),zna.name.substring(lastIndexOfPoint+1),new bigInt(zna.id.substring(2),16)])
		});
		if(formattedZnas.length>0)
		{
		this.ownedZnasTable = this.grid.set(0,2,6,6,contrib.table,{
			keys: true,
			fg: 'green',
			selectedFg: 'white',
			selectedBg: 'blue',
			interactive: true,
			label: 'Owned domains',
			border: {type: "line", fg: "cyan"},
			mouse:true,
			data:{headers: ['Subdomain', 'Index','Token Id'],data:formattedZnas},
			width:"shrink",
			style: {border: {fg: 'red'},header: {fg: 'blue',bold: true,align:"center"},cell: {fg: 'green',align:"center"}},
			align:"center",
			columnSpacing :3,
			columnWidth: [25,5,60]
		});
		}
	}

	//verified connections box
	drawConnectionsBox(verifiedNodes){
		this.verifiedNodesList = this.grid.set(0,2,6,6,blessed.list,{
			label:"Verified nodes",
			mouse:true,
			align:"center",
			selectedFg:"blue",
			selectedBg:"green",
			fg:"white",
			items:verifiedNodes.filter(function(item, pos, self) {return self.indexOf(item) == pos;}),
			interactive:true
		});
	}

	//Profile Box
	drawProfileBox(){
		this.profileBox = this.grid.set(0,2,6,6,blessed.form,{
			keys:true,
			label:"Profile settings",
			mouse:true
		});
		this.submitProfileButton = blessed.button({
			parent: this.profileBox,
			mouse:true,
			keys:true,
			shrink:true,
			content:"Save changes",
			style: {bg: 'black',focus: {bg: 'blue'},hover: {bg: 'blue'},fg:"white"},
			padding: {left: 1,right: 1},
			left:"80%",
			top:"90%"
		});
		this.profileNodeIdLabel = blessed.text({
			parent:this.profileBox,
			content:"Node id : ",
			left:"5%",
			top:"5%",
			fg:"green"
		});
		this.profileNodeId = blessed.text({
			parent:this.profileBox,
			left:"35%",
			top:"5%",
			bg:"gray",
			fg:"white",
			content:""
		});
		this.profileNodeFnLabel = blessed.text({
			parent:this.profileBox,
			content:"Node friendly name :",
			left:"5%",
			top:"20%",
			fg:"green"
		});
		this.profileNodeFn = blessed.textbox({
			parent:this.profileBox,
			left:"35%",
			inputOnFocus: true,
			width:"60%",
			top:"15%",
			fg:"blue",
			focus:{fg:"blue"},
			border:{type:"line"},
			shrink:true,
			value:""
		});
		this.profileNodeFn.on("click",function(){

		});
		this.profileNodeAddressLabel = blessed.text({
                        parent:this.profileBox,
                        content:"ethereum address :",
                        left:"5%",
                        top:"35%",
			fg:"green"
                });
                this.profileNodeAddress = blessed.textbox({
                        parent:this.profileBox,
                        left:"35%",
                        inputOnFocus: true,
                        width:"60%",
                        top:"30%",
                        fg:"blue",
                        focus:{fg:"blue"},
                        border:{type:"line"},
                        shrink:true,
                        value:""
                });
                this.profileNodeAddress.on("click",function(){

                });
		this.profileNodeSigLabel = blessed.text({
                        parent:this.profileBox,
                        content:"ethereum signature :",
                        left:"5%",
                        top:"48%",
			fg:"green"
                });
                this.profileNodeSig = blessed.textbox({
                        parent:this.profileBox,
                        left:"35%",
                        inputOnFocus: true,
                        width:"60%",
                        top:"45%",
                        fg:"blue",
                        focus:{fg:"blue"},
                        border:{type:"line"},
                        shrink:true,
                        value:""
                });
                this.profileNodeSig.on("click",function(){

                });


	}
}
