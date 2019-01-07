package mil.dds.anet.database;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import org.jdbi.v3.core.Handle;
import org.jdbi.v3.core.mapper.MapMapper;
import org.jdbi.v3.core.statement.Query;
import org.jdbi.v3.sqlobject.config.RegisterRowMapper;

import mil.dds.anet.beans.Person;
import mil.dds.anet.beans.Report;
import mil.dds.anet.beans.ReportSensitiveInformation;
import mil.dds.anet.beans.lists.AnetBeanList;
import mil.dds.anet.database.mappers.ReportSensitiveInformationMapper;
import mil.dds.anet.utils.AnetAuditLogger;
import mil.dds.anet.utils.DaoUtils;
import mil.dds.anet.utils.Utils;
import mil.dds.anet.views.ForeignKeyFetcher;

@RegisterRowMapper(ReportSensitiveInformationMapper.class)
public class ReportSensitiveInformationDao implements IAnetDao<ReportSensitiveInformation> {

	private static final String[] fields = { "uuid", "text", "reportUuid", "createdAt", "updatedAt" };
	private static final String tableName = "reportsSensitiveInformation";
	public static final String REPORTS_SENSITIVE_INFORMATION_FIELDS = DaoUtils.buildFieldAliases(tableName, fields, true);

	private Handle dbHandle;
	private final ForeignKeyBatcher<ReportSensitiveInformation> reportIdBatcher;

	public ReportSensitiveInformationDao(Handle h) {
		this.dbHandle = h;
		final String reportIdBatcherSql = "/* batch.getReportSensitiveInformationsByReportUuids */ SELECT " + REPORTS_SENSITIVE_INFORMATION_FIELDS
				+ " FROM \"" + tableName + "\""
				+ " WHERE \"reportUuid\" IN ( <foreignKeys> )";
		this.reportIdBatcher = new ForeignKeyBatcher<ReportSensitiveInformation>(h, reportIdBatcherSql, "foreignKeys", new ReportSensitiveInformationMapper(), "reportsSensitiveInformation_reportUuid");
	}

	@Override
	public AnetBeanList<?> getAll(int pageNum, int pageSize) {
		throw new UnsupportedOperationException();
	}

	public ReportSensitiveInformation getByUuid(String uuid) {
		throw new UnsupportedOperationException();
	}

	@Override
	public List<ReportSensitiveInformation> getByIds(List<String> reportUuids) {
		throw new UnsupportedOperationException();
	}

	public List<List<ReportSensitiveInformation>> getReportSensitiveInformation(List<String> foreignKeys) {
		return reportIdBatcher.getByForeignKeys(foreignKeys);
	}

	@Override
	public ReportSensitiveInformation insert(ReportSensitiveInformation rsi) {
		throw new UnsupportedOperationException();
	}

	public ReportSensitiveInformation insert(ReportSensitiveInformation rsi, Person user, Report report) {
		if (rsi == null || !isAuthorized(user, report)) {
			return null;
		}
		DaoUtils.setInsertFields(rsi);
		dbHandle.createUpdate(
				"/* insertReportsSensitiveInformation */ INSERT INTO \"" + tableName + "\" "
					+ " (uuid, text, \"reportUuid\", \"createdAt\", \"updatedAt\") "
					+ "VALUES (:uuid, :text, :reportUuid, :createdAt, :updatedAt)")
				.bindBean(rsi)
				.bind("createdAt", DaoUtils.asLocalDateTime(rsi.getCreatedAt()))
				.bind("updatedAt", DaoUtils.asLocalDateTime(rsi.getUpdatedAt()))
				.bind("reportUuid", report.getUuid())
				.execute();
		AnetAuditLogger.log("ReportSensitiveInformation {} created by {} ", rsi, user);
		return rsi;
	}

	public int update(ReportSensitiveInformation rsi) {
		throw new UnsupportedOperationException();
	}

	public int update(ReportSensitiveInformation rsi, Person user, Report report) {
		if (rsi == null || !isAuthorized(user, report)) {
			return 0;
		}
		// Update relevant fields, but do not allow the reportUuid to be updated by the query!
		rsi.setUpdatedAt(Instant.now());
		final int numRows = dbHandle.createUpdate(
				"/* updateReportsSensitiveInformation */ UPDATE \"" + tableName + "\""
					+ " SET text = :text, \"updatedAt\" = :updatedAt WHERE uuid = :uuid")
				.bindBean(rsi)
				.bind("updatedAt", DaoUtils.asLocalDateTime(rsi.getUpdatedAt()))
				.execute();
		AnetAuditLogger.log("ReportSensitiveInformation {} updated by {} ", rsi, user);
		return numRows;
	}

	public Object insertOrUpdate(ReportSensitiveInformation rsi, Person user, Report report) {
		return (DaoUtils.getUuid(rsi) == null)
				? insert(rsi, user, report)
				: update(rsi, user, report);
	}

	public CompletableFuture<ReportSensitiveInformation> getForReport(Map<String, Object> context, Report report, Person user) {
		if (!isAuthorized(user, report)) {
			return CompletableFuture.completedFuture(null);
		}
		return new ForeignKeyFetcher<ReportSensitiveInformation>()
				.load(context, "report.reportSensitiveInformation", report.getUuid())
				.thenApply(l ->
		{
			ReportSensitiveInformation rsi = Utils.isEmptyOrNull(l) ? null : l.get(0);
			if (rsi != null) {
				AnetAuditLogger.log("ReportSensitiveInformation {} retrieved by {} ", rsi, user);
			} else {
				rsi = new ReportSensitiveInformation();
			}
			return rsi;
		});
	}

	/**
	 * A user is allowed to access a report's sensitive information if either of the following holds true:
	 * • the user is the author of the report;
	 * • the user is in an authorization group for the report.
	 *
	 * @param user the user executing the request
	 * @param report the report
	 * @return true if the user is allowed to access the report's sensitive information
	 */
	private boolean isAuthorized(Person user, Report report) {
		final String userUuid = DaoUtils.getUuid(user);
		final String reportUuid = DaoUtils.getUuid(report);
		if (userUuid == null || reportUuid == null) {
			// No user or no report
			return false;
		}

		// Check authorization in a single query
		final Query query = dbHandle.createQuery(
				"/* checkReportAuthorization */ SELECT r.uuid"
					+ " FROM reports r"
					+ " LEFT JOIN \"reportAuthorizationGroups\" rag ON rag.\"reportUuid\" = r.uuid"
					+ " LEFT JOIN \"authorizationGroupPositions\" agp ON agp.\"authorizationGroupUuid\" = rag.\"authorizationGroupUuid\" "
					+ " LEFT JOIN positions p ON p.uuid = agp.\"positionUuid\" "
					+ " WHERE r.uuid = :reportUuid"
					+ " AND ("
					+ "   (r.\"authorUuid\" = :userUuid)"
					+ "   OR"
					+ "   (p.\"currentPersonUuid\" = :userUuid)"
					+ " )")
			.bind("reportUuid", reportUuid)
			.bind("userUuid", userUuid);
		return (query.map(new MapMapper(false)).list().size() > 0);
	}

}
