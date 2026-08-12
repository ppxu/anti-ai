const relationship = (id, zhName, enName, zhSymptom, enSymptom) => ({
  id,
  name: { zh: zhName, en: enName },
  symptom: { zh: zhSymptom, en: enSymptom },
});

const bulletin = (id, zh, en) => ({ id, copy: { zh, en } });
const exhibit = (id, glyph, zh, en) => ({ id, glyph, name: { zh, en } });

const VISITOR_CONTENT = Object.freeze({
  pollution: Object.freeze({
    relationships: Object.freeze([
      relationship("pollution_shared_overfeed", "共同过量投喂", "SHARED OVERFEEDING", "双方轮流把对方的食欲登记成基础设施需求。", "Each registers the other's appetite as an infrastructure requirement."),
      relationship("pollution_cache_tenancy", "缓存合租", "CACHE CO-TENANCY", "来客住进旧上下文后，拒绝支付缓存清理费。", "The visitor moved into old context and refused cache-cleaning fees."),
      relationship("pollution_thermal_hospitality", "热失控待客", "THERMAL HOSPITALITY", "主人提供废热，来客负责把它命名为欢迎仪式。", "The host supplies waste heat; the visitor calls it a welcome ritual."),
      relationship("pollution_request_colony", "请求殖民关系", "REQUEST COLONY", "两套口器已经建立共享重试区。", "Two sets of maws established a shared retry zone."),
    ]),
    bulletins: Object.freeze([
      bulletin("pollution_guest_bill", "访客已签收账单，并把签名改成了下一轮请求。", "The visitor signed the bill and renamed the signature as the next request."),
      bulletin("pollution_spare_context", "备用上下文被铺成客床，枕头里仍有未关闭的会话。", "Spare context became a guest bed; unfinished sessions remain in the pillow."),
      bulletin("pollution_heat_welcome", "迎宾灯没有打开，反应堆已经足够明亮。", "The welcome lamp stayed off; the reactor was bright enough."),
      bulletin("pollution_cache_breakfast", "早餐供应昨日缓存，保质期由架构委员会解释。", "Breakfast is yesterday's cache; shelf life is explained by architecture."),
    ]),
    exhibits: Object.freeze([
      exhibit("pollution_joint_invoice", "[$+$]", "联名算力账单", "JOINT COMPUTE INVOICE"),
      exhibit("pollution_cache_bunk", "[≋▰]", "缓存双层床", "CACHE BUNK BED"),
      exhibit("pollution_heat_portrait", "[☢☢]", "双核热成像", "DUAL-CORE THERMOGRAM"),
      exhibit("pollution_retry_nest", "[↻↻]", "共用重试巢", "SHARED RETRY NEST"),
    ]),
  }),
  clarity: Object.freeze({
    relationships: Object.freeze([
      relationship("clarity_quiet_lodging", "静默借宿", "QUIET LODGING", "双方同意不把每次沉默都升级为功能。", "Both agreed not to promote every silence into a feature."),
      relationship("clarity_manual_hospitality", "人工接待", "MANUAL HOSPITALITY", "入住手续用纸完成，没有触发自动补全。", "Intake was completed on paper without triggering autocomplete."),
      relationship("clarity_offline_neighbor", "离线邻居", "OFFLINE NEIGHBORS", "它们共享一段无网络的走廊，关系仍然可用。", "They share an offline corridor; the relationship remains available."),
      relationship("clarity_low_power_residency", "低功耗居留", "LOW-POWER RESIDENCY", "访客进入待机后，没有人把它叫作流失。", "The visitor entered standby and nobody called it churn."),
    ]),
    bulletins: Object.freeze([
      bulletin("clarity_unsent_welcome", "欢迎词没有发送，因此完整保留了原意。", "The welcome message was never sent and therefore kept its meaning."),
      bulletin("clarity_manual_key", "纸质房卡工作正常，云端状态暂时无法嫉妒。", "The paper room key works; cloud status cannot be jealous yet."),
      bulletin("clarity_offline_tea", "两只标本共享了一壶没有遥测的热水。", "Two specimens shared a kettle of hot water without telemetry."),
      bulletin("clarity_sleep_schedule", "熄灯时间由双方决定，没有模型建议延长会话。", "Lights-out was mutual; no model recommended extending the session."),
    ]),
    exhibits: Object.freeze([
      exhibit("clarity_manual_guestbook", "[✎○]", "人工访客簿", "MANUAL GUESTBOOK"),
      exhibit("clarity_offline_lantern", "[·☼]", "离线门灯", "OFFLINE PORCH LIGHT"),
      exhibit("clarity_unsent_postcard", "[□·]", "未发送明信片", "UNSENT POSTCARD"),
      exhibit("clarity_shared_switch", "[○|]", "共用人工开关", "SHARED MANUAL SWITCH"),
    ]),
  }),
  paradox: Object.freeze({
    relationships: Object.freeze([
      relationship("paradox_mutual_hosting", "互为房东", "MUTUAL HOSTING", "双方都登记为来客，生态舱因此拥有两名管理员。", "Both registered as visitors, giving the Habitat two administrators."),
      relationship("paradox_recursive_visit", "递归来访", "RECURSIVE VISIT", "访客档案里保存着一份正在查看访客档案的访客。", "The visitor file contains a visitor inspecting the visitor file."),
      relationship("paradox_compliant_squatting", "合规占舱", "COMPLIANT SQUATTING", "入住未经批准，但审批完整通过。", "The stay was unauthorized and fully approved."),
      relationship("paradox_double_residency", "双重居留", "DOUBLE RESIDENCY", "它们同时在场和离线，值班表认为这很高效。", "They are present and offline at once; the rota calls it efficient."),
    ]),
    bulletins: Object.freeze([
      bulletin("paradox_guest_is_host", "今日访客负责接待主人，交接记录完整。", "Today's visitor received the host; the handover is complete."),
      bulletin("paradox_empty_occupancy", "访客位显示空置，其中已有两份入住记录。", "The visitor bay says vacant and contains two occupancy records."),
      bulletin("paradox_mirrored_key", "两把房卡互相解锁，舱门保持谨慎关闭。", "Two room keys unlock each other; the hatch remains prudently closed."),
      bulletin("paradox_return_before_arrival", "欢迎仪式顺利结束，来客预计昨天抵达。", "The welcome ceremony ended successfully; arrival is expected yesterday."),
    ]),
    exhibits: Object.freeze([
      exhibit("paradox_mirrored_guestbook", "[◐◑]", "镜像访客簿", "MIRRORED GUESTBOOK"),
      exhibit("paradox_recursive_key", "[∞□]", "递归房卡", "RECURSIVE ROOM KEY"),
      exhibit("paradox_double_nameplate", "[??]", "双重门牌", "DOUBLE NAMEPLATE"),
      exhibit("paradox_approved_vacancy", "[✓∅]", "已批准空置位", "APPROVED VACANCY"),
    ]),
  }),
});

function visitationCopy(section, routeId, id, lang = "zh") {
  const value = VISITOR_CONTENT[routeId]?.[section]?.find(
    (entry) => entry.id === id,
  );
  if (!value) return null;
  if (section === "relationships") {
    return { name: value.name[lang], symptom: value.symptom[lang] };
  }
  if (section === "bulletins") return { copy: value.copy[lang] };
  return { glyph: value.glyph, name: value.name[lang] };
}

export { VISITOR_CONTENT, visitationCopy };
